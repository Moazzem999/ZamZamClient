namespace ZamZamClient.Models;

public class Product
{
    public int Id { get; set; }
    public string FilterCategory { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Specifications { get; set; } = string.Empty;
    public bool IsFeatured { get; set; }
}
