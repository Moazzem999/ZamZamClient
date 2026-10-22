using Microsoft.AspNetCore.Mvc;

namespace ZamZamClient.Controllers;

public class DashboardController : Controller
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<DashboardController> _logger;

    public DashboardController(IConfiguration configuration, ILogger<DashboardController> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet]
    public IActionResult Index()
    {
        // Server-side authentication check: ensure valid token cookie is present
        var token = Request.Cookies["zamzam_token"] ?? Request.Cookies["token"];
        if (string.IsNullOrWhiteSpace(token))
        {
            _logger.LogWarning("Unauthorized attempt to access Dashboard without authentication. Redirecting to Login.");
            return RedirectToAction("Login", "Account");
        }

        ViewBag.ApiBaseUrl = _configuration["ApiBaseUrl"] ?? "https://localhost:7148";
        ViewBag.UserDisplayName = System.Net.WebUtility.UrlDecode(Request.Cookies["userDisplayName"] ?? "");
        ViewBag.UserDisplayEmail = System.Net.WebUtility.UrlDecode(Request.Cookies["userDisplayEmail"] ?? "");

        return View();
    }

    [HttpGet]
    public IActionResult BrandImages()
    {
        // Server-side authentication check
        var token = Request.Cookies["zamzam_token"] ?? Request.Cookies["token"];
        if (string.IsNullOrWhiteSpace(token))
        {
            _logger.LogWarning("Unauthorized attempt to access Brand Images without authentication. Redirecting to Login.");
            return RedirectToAction("Login", "Account");
        }

        ViewBag.ApiBaseUrl = _configuration["ApiBaseUrl"] ?? "https://localhost:7148";
        ViewBag.UserDisplayName = System.Net.WebUtility.UrlDecode(Request.Cookies["userDisplayName"] ?? "");
        ViewBag.UserDisplayEmail = System.Net.WebUtility.UrlDecode(Request.Cookies["userDisplayEmail"] ?? "");

        return View();
    }

    [HttpGet]
    public IActionResult AboutUs()
    {
        // Server-side authentication check
        var token = Request.Cookies["zamzam_token"] ?? Request.Cookies["token"];
        if (string.IsNullOrWhiteSpace(token))
        {
            _logger.LogWarning("Unauthorized attempt to access About Us without authentication. Redirecting to Login.");
            return RedirectToAction("Login", "Account");
        }

        ViewBag.ApiBaseUrl = _configuration["ApiBaseUrl"] ?? "https://localhost:7148";
        ViewBag.UserDisplayName = System.Net.WebUtility.UrlDecode(Request.Cookies["userDisplayName"] ?? "");
        ViewBag.UserDisplayEmail = System.Net.WebUtility.UrlDecode(Request.Cookies["userDisplayEmail"] ?? "");

        return View();
    }

    [HttpGet]
    public IActionResult Quotations()
    {
        // Server-side authentication check
        var token = Request.Cookies["zamzam_token"] ?? Request.Cookies["token"];
        if (string.IsNullOrWhiteSpace(token))
        {
            _logger.LogWarning("Unauthorized attempt to access Quotations without authentication. Redirecting to Login.");
            return RedirectToAction("Login", "Account");
        }

        ViewBag.ApiBaseUrl = _configuration["ApiBaseUrl"] ?? "https://localhost:7148";
        ViewBag.UserDisplayName = System.Net.WebUtility.UrlDecode(Request.Cookies["userDisplayName"] ?? "");
        ViewBag.UserDisplayEmail = System.Net.WebUtility.UrlDecode(Request.Cookies["userDisplayEmail"] ?? "");

        return View();
    }
}
