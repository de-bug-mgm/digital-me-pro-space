using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Api.Models;

namespace Api.Functions;

public class ChatFunction
{
    private readonly ILogger<ChatFunction> _logger;
    private readonly HttpClient _httpClient;

    public ChatFunction(ILogger<ChatFunction> logger, IHttpClientFactory httpClientFactory)
    {
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient();
    }

    [Function("ChatFunction")]
    public async Task<HttpResponseData> Run([HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "chat")] HttpRequestData req)
    {
        _logger.LogInformation("Processing chat request.");

        try
        {
            // Parse request body
            var requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            var chatRequest = JsonSerializer.Deserialize<ChatRequest>(requestBody);

            if (string.IsNullOrWhiteSpace(chatRequest?.Message))
            {
                var badResponse = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResponse.WriteStringAsync("Message is required.");
                return badResponse;
            }

            // Read resume.json
            var resumePath = Path.Combine(Environment.CurrentDirectory, "..", "data", "resume.json");
            var resumeJson = string.Empty;
            if (File.Exists(resumePath))
            {
                resumeJson = await File.ReadAllTextAsync(resumePath);
            }
            else
            {
                // Fallback for deployed environment where data might be copied to output
                resumePath = Path.Combine(Environment.CurrentDirectory, "data", "resume.json");
                if (File.Exists(resumePath))
                {
                    resumeJson = await File.ReadAllTextAsync(resumePath);
                }
            }

            // Get API Key
            var apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
            if (string.IsNullOrEmpty(apiKey) || apiKey == "YOUR_LOCAL_API_KEY_HERE")
            {
                _logger.LogError("GEMINI_API_KEY is not configured properly.");
                var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResponse.WriteStringAsync("AI Assistant is not configured properly.");
                return errorResponse;
            }

            // Build Gemini Request
            var systemPrompt = $"You are a warm, conversational, and helpful AI assistant representing the professional portfolio of Jane Doe. Answer the visitor's questions accurately based ONLY on the following resume data: {resumeJson} Keep responses concise (under 150 words), polite, and professional. If asked about something not in the resume, politely state you do not have that information.";

            var geminiReq = new GeminiRequest
            {
                SystemInstruction = new GeminiSystemInstruction
                {
                    Parts = new[] { new GeminiPart { Text = systemPrompt } }
                },
                Contents = new[]
                {
                    new GeminiContent
                    {
                        Role = "user",
                        Parts = new[] { new GeminiPart { Text = chatRequest.Message } }
                    }
                }
            };

            var jsonContent = new StringContent(JsonSerializer.Serialize(geminiReq), Encoding.UTF8, "application/json");
            var requestUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}";

            var response = await _httpClient.PostAsync(requestUrl, jsonContent);
            response.EnsureSuccessStatusCode();

            var responseBody = await response.Content.ReadAsStringAsync();
            var geminiResponse = JsonSerializer.Deserialize<GeminiResponse>(responseBody);

            var reply = geminiResponse?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text ?? "I'm sorry, I couldn't generate a response.";

            var successResponse = req.CreateResponse(HttpStatusCode.OK);
            await successResponse.WriteAsJsonAsync(new ChatResponse { Reply = reply });
            return successResponse;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing chat request");
            var errorResponse = req.CreateResponse(HttpStatusCode.InternalServerError);
            await errorResponse.WriteStringAsync("An error occurred processing your request.");
            return errorResponse;
        }
    }
}