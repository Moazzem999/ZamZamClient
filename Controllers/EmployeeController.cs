using Microsoft.AspNetCore.Mvc;

namespace ZamZamClient.Controllers;

public class EmployeeController : Controller
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmployeeController> _logger;

    public EmployeeController(IConfiguration configuration, ILogger<EmployeeController> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet]
    public IActionResult Index()
    {
        return RedirectToAction(nameof(List));
    }

    [HttpGet]
    public IActionResult List()
    {
        // Server-side authentication check: ensure valid token cookie is present
        var token = Request.Cookies["zamzam_token"] ?? Request.Cookies["token"];
        if (string.IsNullOrWhiteSpace(token))
        {
            _logger.LogWarning("Unauthorized attempt to access Employee List without authentication. Redirecting to Login.");
            return RedirectToAction("Login", "Account");
        }

        ViewBag.ApiBaseUrl = _configuration["ApiBaseUrl"] ?? "https://localhost:7148";
        ViewBag.UserDisplayName = System.Net.WebUtility.UrlDecode(Request.Cookies["userDisplayName"] ?? "");
        ViewBag.UserDisplayEmail = System.Net.WebUtility.UrlDecode(Request.Cookies["userDisplayEmail"] ?? "");

        return View();
    }

    [HttpGet]
    public IActionResult Create()
    {
        // Server-side authentication check: ensure valid token cookie is present
        var token = Request.Cookies["zamzam_token"] ?? Request.Cookies["token"];
        if (string.IsNullOrWhiteSpace(token))
        {
            _logger.LogWarning("Unauthorized attempt to access Employee Create without authentication. Redirecting to Login.");
            return RedirectToAction("Login", "Account");
        }

        ViewBag.ApiBaseUrl = _configuration["ApiBaseUrl"] ?? "https://localhost:7148";
        ViewBag.UserDisplayName = System.Net.WebUtility.UrlDecode(Request.Cookies["userDisplayName"] ?? "");
        ViewBag.UserDisplayEmail = System.Net.WebUtility.UrlDecode(Request.Cookies["userDisplayEmail"] ?? "");

        return View();
    }

    [HttpGet]
    public IActionResult Tracking()
    {
        // Server-side authentication check: ensure valid token cookie is present
        var token = Request.Cookies["zamzam_token"] ?? Request.Cookies["token"];
        if (string.IsNullOrWhiteSpace(token))
        {
            _logger.LogWarning("Unauthorized attempt to access Employee Tracking without authentication. Redirecting to Login.");
            return RedirectToAction("Login", "Account");
        }

        ViewBag.ApiBaseUrl = _configuration["ApiBaseUrl"] ?? "https://localhost:7148";
        ViewBag.UserDisplayName = System.Net.WebUtility.UrlDecode(Request.Cookies["userDisplayName"] ?? "");
        ViewBag.UserDisplayEmail = System.Net.WebUtility.UrlDecode(Request.Cookies["userDisplayEmail"] ?? "");

        return View();
    }
}
