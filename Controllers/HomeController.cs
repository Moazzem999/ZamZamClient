using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using ZamZamClient.Models;
using ZamZamClient.Services;

namespace ZamZamClient.Controllers;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;
    private readonly IDataService _dataService;

    public HomeController(ILogger<HomeController> logger, IDataService dataService)
    {
        _logger = logger;
        _dataService = dataService;
    }

    public IActionResult Index()
    {
        var model = new HomeViewModel
        {
            FeaturedProducts = _dataService.GetFeaturedProducts(),
            Services = _dataService.GetAllServices(),
            FeaturedMachineries = _dataService.GetAllMachineries().Take(6).ToList(),
            TeamMembers = _dataService.GetTeamMembers(),
            ProcessSteps = _dataService.GetProcessSteps()
        };
        return View(model);
    }

    public IActionResult About()
    {
        ViewBag.Team = _dataService.GetTeamMembers();
        ViewBag.ProcessSteps = _dataService.GetProcessSteps();
        return View();
    }

    public IActionResult Services(string? slug)
    {
        var services = _dataService.GetAllServices();
        if (!string.IsNullOrEmpty(slug))
        {
            var selected = _dataService.GetServiceBySlug(slug);
            ViewBag.SelectedService = selected;
        }
        return View(services);
    }

    public IActionResult Products(string? category, string? search)
    {
        var products = _dataService.GetAllProducts();

        if (!string.IsNullOrWhiteSpace(category) && !category.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            products = products.Where(p => p.FilterCategory.Equals(category, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLowerInvariant();
            products = products.Where(p => p.Title.ToLowerInvariant().Contains(s) || 
                                           p.Category.ToLowerInvariant().Contains(s) ||
                                           p.Description.ToLowerInvariant().Contains(s)).ToList();
        }

        ViewBag.CurrentCategory = category ?? "all";
        ViewBag.CurrentSearch = search ?? "";
        ViewBag.TotalCount = products.Count;

        return View(products);
    }

    [HttpGet]
    public IActionResult ProductDetail(int id)
    {
        var product = _dataService.GetProductById(id);
        if (product == null)
        {
            return NotFound();
        }
        return Json(product);
    }

    public IActionResult Machineries(string? category)
    {
        var machineries = _dataService.GetAllMachineries();

        if (!string.IsNullOrWhiteSpace(category) && !category.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            machineries = machineries.Where(m => m.FilterCategory.Equals(category, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        ViewBag.CurrentCategory = category ?? "all";
        return View(machineries);
    }

    public IActionResult Contact()
    {
        return View(new ContactMessageViewModel());
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult SubmitContact(ContactMessageViewModel model)
    {
        if (ModelState.IsValid)
        {
            TempData["SuccessMessage"] = $"Thank you, {model.FirstName}! Your message has been received. Our team will contact you shortly at {model.Email}.";
            return RedirectToAction(nameof(Contact));
        }

        TempData["ErrorMessage"] = "Please check the form inputs and try again.";
        return View("Contact", model);
    }

    [HttpGet]
    public IActionResult RequestQuote(string? product, string? service)
    {
        var model = new QuoteRequestViewModel
        {
            ProductName = product,
            ServiceType = service ?? "Trims & Accessories"
        };
        return View(model);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult SubmitQuote(QuoteRequestViewModel model)
    {
        if (ModelState.IsValid)
        {
            TempData["SuccessMessage"] = $"Thank you, {model.FullName}! Your quotation request for '{model.ServiceType}' has been dispatched to our sales & estimation department. We will contact you at {model.Phone} / {model.Email} within 2-4 business hours.";
            return RedirectToAction(nameof(RequestQuote));
        }

        TempData["ErrorMessage"] = "Please fill in all required fields accurately.";
        return View("RequestQuote", model);
    }

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
