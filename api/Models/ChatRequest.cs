using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Api.Models;

public class ChatRequest
{
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("history")]
    public List<ChatMessageItem>? History { get; set; }
}

public class ChatMessageItem
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty; // "user" or "model"

    [JsonPropertyName("text")]
    public string Text { get; set; } = string.Empty;
}