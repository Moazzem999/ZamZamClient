using System.ComponentModel.DataAnnotations;

namespace ZamZamClient.Models;

public class QuoteRequestViewModel
{
    [Required(ErrorMessage = "Full Name is required")]
    [Display(Name = "Full Name")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email address is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Phone number is required")]
    [Display(Name = "Phone Number")]
    public string Phone { get; set; } = string.Empty;

    [Display(Name = "Company / Garments Name")]
    public string? CompanyName { get; set; }

    [Required(ErrorMessage = "Please select a service or product type")]
    [Display(Name = "Category / Service Type")]
    public string ServiceType { get; set; } = string.Empty;

    [Display(Name = "Product Name (Optional)")]
    public string? ProductName { get; set; }

    [Display(Name = "Estimated Quantity")]
    public string? Quantity { get; set; }

    [Display(Name = "Project Requirements & Specifications")]
    public string? Message { get; set; }
}
