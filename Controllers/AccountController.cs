using Microsoft.AspNetCore.Mvc;
using ZamZamClient.Models;

namespace ZamZamClient.Controllers;

public class AccountController : Controller
{
    private readonly ILogger<AccountController> _logger;

    public AccountController(ILogger<AccountController> logger)
    {
        _logger = logger;
    }

    [HttpGet]
    public IActionResult Login(string? returnUrl = null)
    {
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
        TempData["SuccessMessage"] = "You have been logged out successfully.";
        return RedirectToAction("Index", "Home");
    }
}
