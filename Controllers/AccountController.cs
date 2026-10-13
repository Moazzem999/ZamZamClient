using Microsoft.AspNetCore.Mvc;
using ZamZamClient.Models;

namespace ZamZamClient.Controllers;

public class AccountController : Controller
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<AccountController> _logger;

    public AccountController(IConfiguration configuration, ILogger<AccountController> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet]
    public IActionResult Login(string? returnUrl = null)
    {
        ViewBag.ApiBaseUrl = _configuration["ApiBaseUrl"] ?? "https://localhost:7148";

        var model = new LoginViewModel
        {
            ReturnUrl = returnUrl
        };
        return View(model);
    }


    [HttpGet]
    public IActionResult Logout()
    {
        _logger.LogInformation("User logged out.");
        Response.Cookies.Delete("zamzam_token");
        Response.Cookies.Delete("token");
        TempData["SuccessMessage"] = "You have been logged out successfully.";
        return RedirectToAction("Login", "Account");
    }
}
