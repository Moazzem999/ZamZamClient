using ZamZamClient.Models;

namespace ZamZamClient.Services;

public interface IDataService
{
    List<Product> GetAllProducts();
    List<Product> GetFeaturedProducts();
    Product? GetProductById(int id);
    List<Machinery> GetAllMachineries();
    Machinery? GetMachineryById(int id);
    List<ServiceItem> GetAllServices();
    ServiceItem? GetServiceBySlug(string slug);
    List<TeamMember> GetTeamMembers();
    List<ProcessStep> GetProcessSteps();
}
