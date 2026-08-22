using System.Text.Json.Serialization;

namespace Api.Models;

public class GeminiRequest
{
    [JsonPropertyName("contents")]
    public GeminiContent[] Contents { get; set; } = Array.Empty<GeminiContent>();

    [JsonPropertyName("systemInstruction")]
    public GeminiSystemInstruction? SystemInstruction { get; set; }
}

public class GeminiSystemInstruction
{
    [JsonPropertyName("parts")]
    public GeminiPart[] Parts { get; set; } = Array.Empty<GeminiPart>();
}

public class GeminiContent
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = "user";

    [JsonPropertyName("parts")]
    public GeminiPart[] Parts { get; set; } = Array.Empty<GeminiPart>();
}

public class GeminiPart
{
    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}

public class GeminiResponse
{
    [JsonPropertyName("candidates")]
    public GeminiCandidate[] Candidates { get; set; } = Array.Empty<GeminiCandidate>();
}

public class GeminiCandidate
{
    [JsonPropertyName("content")]
    public GeminiContent Content { get; set; } = new GeminiContent();
}