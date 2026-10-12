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

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Login(LoginViewModel model)
    {
        if (!ModelState.IsValid)
        {
            return View(model);
        }

        // Demo login check: accepts standard demo credentials or any validly formatted test account
        bool isValidCredentials = 
            (model.Username.Equals("admin", StringComparison.OrdinalIgnoreCase) && model.Password == "admin123") ||
            (model.Username.Equals("buyer", StringComparison.OrdinalIgnoreCase) && model.Password == "buyer123") ||
            (model.Username.Equals("admin@zztbl.com", StringComparison.OrdinalIgnoreCase) && model.Password == "admin123") ||
            (model.Username.Equals("buyer@garments.com", StringComparison.OrdinalIgnoreCase) && model.Password == "buyer123") ||
            (!string.IsNullOrWhiteSpace(model.Username) && model.Password.Length >= 6);

        if (isValidCredentials)
        {
            _logger.LogInformation("User {Username} logged in successfully.", model.Username);
            TempData["SuccessMessage"] = $"Welcome back, {model.Username}! You have successfully signed in.";

            if (!string.IsNullOrEmpty(model.ReturnUrl) && Url.IsLocalUrl(model.ReturnUrl))
            {
                return Redirect(model.ReturnUrl);
            }

            return RedirectToAction("Index", "Home");
        }

        ModelState.AddModelError(string.Empty, "Invalid username or password. Please check your credentials.");
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
