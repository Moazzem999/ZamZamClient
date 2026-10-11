namespace ZamZamClient.Models;

public class ServiceItem
{
    public int Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string ShortDescription { get; set; } = string.Empty;
    public string FullDescription { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string IconClass { get; set; } = string.Empty;
    public List<string> Highlights { get; set; } = new();
}
