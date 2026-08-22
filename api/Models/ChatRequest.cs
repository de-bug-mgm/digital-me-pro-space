using System.Text.Json.Serialization;

namespace Api.Models;

public class ChatRequest
{
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;
}