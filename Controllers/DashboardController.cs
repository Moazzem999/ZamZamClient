using Microsoft.AspNetCore.Mvc;

namespace ZamZamClient.Controllers;

public class DashboardController : Controller
{
    private readonly ILogger<DashboardController> _logger;

    public DashboardController(ILogger<DashboardController> logger)
    {
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

        ViewBag.UserDisplayName = System.Net.WebUtility.UrlDecode(Request.Cookies["userDisplayName"] ?? "");
        ViewBag.UserDisplayEmail = System.Net.WebUtility.UrlDecode(Request.Cookies["userDisplayEmail"] ?? "");

        return View();
    }
}
