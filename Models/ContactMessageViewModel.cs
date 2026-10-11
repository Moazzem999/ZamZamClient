using System.ComponentModel.DataAnnotations;

namespace ZamZamClient.Models;

public class ContactMessageViewModel
{
    [Required(ErrorMessage = "First name is required")]
    [Display(Name = "First Name")]
    public string FirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Last name is required")]
    [Display(Name = "Last Name")]
    public string LastName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email address is required")]
    [EmailAddress(ErrorMessage = "Invalid email format")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Phone number is required")]
    [Display(Name = "Phone Number")]
    public string Phone { get; set; } = string.Empty;

    [Display(Name = "Subject")]
    public string? Subject { get; set; }

    [Required(ErrorMessage = "Message is required")]
    [Display(Name = "Message")]
    public string Message { get; set; } = string.Empty;
}
