namespace ZamZamClient.Models;

public class ProcessStep
{
    public int StepNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public List<string> Checkpoints { get; set; } = new();
}
