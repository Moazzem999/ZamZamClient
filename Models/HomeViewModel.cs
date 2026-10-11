namespace ZamZamClient.Models;

public class HomeViewModel
{
    public List<Product> FeaturedProducts { get; set; } = new();
    public List<ServiceItem> Services { get; set; } = new();
    public List<Machinery> FeaturedMachineries { get; set; } = new();
    public List<TeamMember> TeamMembers { get; set; } = new();
    public List<ProcessStep> ProcessSteps { get; set; } = new();
    public QuoteRequestViewModel QuickQuote { get; set; } = new();
}
