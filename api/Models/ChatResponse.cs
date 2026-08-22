using System.Text.Json.Serialization;

namespace Api.Models;

public class ChatResponse
{
    [JsonPropertyName("reply")]
    public string Reply { get; set; } = string.Empty;
}