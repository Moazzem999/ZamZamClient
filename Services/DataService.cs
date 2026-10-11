using System.Text.Json;
using ZamZamClient.Models;

namespace ZamZamClient.Services;

public class DataService : IDataService
{
    private readonly IWebHostEnvironment _env;
    private readonly List<Product> _products = new();
    private readonly List<Machinery> _machineries = new();
    private readonly List<ServiceItem> _services = new();
    private readonly List<TeamMember> _team = new();
    private readonly List<ProcessStep> _processSteps = new();

    public DataService(IWebHostEnvironment env)
    {
        _env = env;
        LoadCatalog();
        InitializeServices();
        InitializeTeam();
        InitializeProcessSteps();
    }

    private void LoadCatalog()
    {
        try
        {
            var jsonPath = Path.Combine(_env.ContentRootPath, "Data", "catalog.json");
            if (File.Exists(jsonPath))
            {
                var jsonContent = File.ReadAllText(jsonPath);
                using var doc = JsonDocument.Parse(jsonContent);
                var root = doc.RootElement;

                if (root.TryGetProperty("Products", out var prodArray))
                {
                    foreach (var elem in prodArray.EnumerateArray())
                    {
                        var rawImg = elem.GetProperty("ImageUrl").GetString() ?? "";
                        var normalizedImg = rawImg.StartsWith("/") ? rawImg : "/" + rawImg;

                        var cat = elem.GetProperty("Category").GetString() ?? "";
                        var filterCat = elem.GetProperty("FilterCategory").GetString() ?? "";
                        var title = elem.GetProperty("Title").GetString() ?? "";
                        var id = elem.GetProperty("Id").GetInt32();

                        var desc = GenerateProductDescription(filterCat, title);
                        var specs = GenerateProductSpecs(filterCat, title);
                        var isFeatured = id % 7 == 0 || filterCat == "label" || filterCat == "button" || filterCat == "zipper";

                        _products.Add(new Product
                        {
                            Id = id,
                            Title = title,
                            Category = string.IsNullOrWhiteSpace(cat) ? FormatCategory(filterCat) : cat,
                            FilterCategory = filterCat.ToLowerInvariant(),
                            ImageUrl = normalizedImg,
                            Description = desc,
                            Specifications = specs,
                            IsFeatured = isFeatured
                        });
                    }
                }

                if (root.TryGetProperty("Machineries", out var machArray))
                {
                    foreach (var elem in machArray.EnumerateArray())
                    {
                        var rawImg = elem.GetProperty("ImageUrl").GetString() ?? "";
                        var normalizedImg = rawImg.StartsWith("/") ? rawImg : "/" + rawImg;

                        var cat = elem.GetProperty("Category").GetString() ?? "";
                        var filterCat = elem.GetProperty("FilterCategory").GetString() ?? "";
                        var title = elem.GetProperty("Title").GetString() ?? "";
                        var id = elem.GetProperty("Id").GetInt32();

                        _machineries.Add(new Machinery
                        {
                            Id = id,
                            Title = title,
                            Category = string.IsNullOrWhiteSpace(cat) ? FormatCategory(filterCat) : cat,
                            FilterCategory = filterCat.ToLowerInvariant(),
                            ImageUrl = normalizedImg,
                            Description = $"High precision {title} unit engineered for high-throughput, high-durability apparel accessories production.",
                            KeyCapabilities = GetMachineryCapabilities(title, filterCat)
                        });
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error loading catalog: {ex.Message}");
        }
    }

    private static string FormatCategory(string filter)
    {
        return filter switch
        {
            "label" => "Label Solutions",
            "button" => "Buttons",
            "emboss" => "Emboss Paper",
            "thread" => "Sewing Threads",
            "elastic" => "Elastic Band",
            "ribbon" => "Ribbons & Tapes",
            "hangtag" => "Hang Tags",
            "tape" => "Packaging & Specialty Tape",
            "zipper" => "Zippers & Pullers",
            "offset" => "Offset Printing",
            "others" => "Specialized Finishing",
            _ => char.ToUpper(filter[0]) + filter[1..]
        };
    }

    private static string GenerateProductDescription(string filterCat, string title)
    {
        return filterCat switch
        {
            "label" => $"Premium {title} crafted with high thread-density yarns, soft edges, skin-friendly texture, and certified color fastness for luxury and casual apparel.",
            "button" => $"Engineered {title} available in diverse finishes, custom logo engraving, scratch-resistant surface, and OEKO-TEX compliant materials.",
            "emboss" => $"Exquisite {title} featuring sharp 3D embossing, foil accents, and high-tensile GSM board suited for premium garments and luxury branding.",
            "thread" => $"High-tenacity {title} delivering smooth seam elasticity, minimal breakage on high-speed industrial sewing machines, and superior wash durability.",
            "elastic" => $"Resilient {title} with consistent modulus, skin-comfort woven/knitted structures, and long-lasting recovery across repeated wash cycles.",
            "ribbon" => $"Finely finished {title} woven to perfection, offering vibrant sheen, precise width tolerances, and customizable heat-transfer printing.",
            "hangtag" => $"Signature {title} manufactured on premium paperboard with metallic foiling, matte/gloss lamination, UV spot, and custom eyeletting.",
            "tape" => $"Industrial grade {title} formulated for heavy-duty sealing, high tensile strength, and resilient adhesion under diverse environmental conditions.",
            "zipper" => $"Smooth-gliding {title} engineered with reinforced tape, durable teeth casting, and heavy-duty slider pullers tested for over 10,000 cycles.",
            _ => $"High quality {title} manufactured with international grade standards to meet modern garment manufacturing demands."
        };
    }

    private static string GenerateProductSpecs(string filterCat, string title)
    {
        return filterCat switch
        {
            "label" => "Material: 100% Polyester / Damask / Satin | Edge: Ultrasonic Cut / Heat Cut | Colors: Up to 8 Colors | Fastness: Grade 4+",
            "button" => "Material: Polyester / Resin / Alloy / Horn | Size: 14L - 48L | Finish: Matte, High Gloss, Laser Engraved | Wash: Enzyme Proof",
            "emboss" => "GSM: 250 - 600 GSM | Technique: Deep Blind Emboss / Gold Foil / UV Coating | Board: Recycled Kraft & Art Card",
            "thread" => "Composition: 100% Spun Cotton & Polyester | Counts: 20/2, 40/2, 50/2 | Lubrication: High-Grade Silicone Wax",
            "elastic" => "Width: 6mm - 75mm | Elongation: 120% - 160% | Material: Natural Rubber / Spandex with Poly Filament",
            "ribbon" => "Weave: Satin / Grosgrain / Herringbone | Width: 3mm - 50mm | Color: Pantone Matching Available",
            "hangtag" => "Stock: Ivory Card, Craft Paper, PVC, Duplex | Thickness: 300 - 800 GSM | Cord: Cotton, Waxed, Elastic with Seal",
            "tape" => "Base: BOPP / Reinforced Kraft / Cotton Twill | Adhesive: Water-based Acrylic / Hot Melt | Tensile: High Shear",
            "zipper" => "Type: #3, #5, #8, #10 | Teeth: Metal, Nylon Coil, Plastic Vislon | Puller: Custom Logo Zinc Alloy",
            _ => "Standard: International Export Grade | Customization: Custom Sizes & Colors Available"
        };
    }

    private static string GetMachineryCapabilities(string title, string filterCat)
    {
        return title switch
        {
            "GTO" => "High precision German-engineered Heidelberg GTO offset press ensuring microscopic dot reproduction and vibrant color fidelity.",
            "MO" => "Heidelberg MO multi-color offset platform tailored for large-format apparel packaging, tag sheets, and marketing collateral.",
            "DMAI" => "Heavy-duty automated printing press optimizing ink transfer on heavy GSM cardstock and textured board substrates.",
            "Polar Cutting" => "Microprocessor-controlled Polar high-speed guillotine paper cutter delivering 0.1mm dimensional precision across 1000-sheet reams.",
            "Die Cutting" => "High-tonnage automatic die-cutting and creasing machine executing intricate curves, hang tag windows, and folding creases.",
            "Foil" => "Precision thermal foil stamping unit stamping gold, silver, holographic, and metallic foils with uniform heat distribution.",
            "Spot" => "Automated screen spot UV coater producing high-gloss sensory contrasts on matte laminated hang tags and packaging.",
            "Auto Screen" => "Multi-color automated screen printing carousel for continuous ribbon, tape, and care label graphics.",
            "Screen Print" => "High-resolution flatbed screen print line for specialized discharge, plastisol, and metallic ink applications.",
            "Rotary" => "High-speed multi-station rotary label press handling large volume care labels and fabric tape printing.",
            "Cut Fold" => "Fully automated label cut and fold system executing center fold, end fold, miter fold, and booklet fold.",
            "Flexo" => "Central impression flexographic press running water-based non-toxic inks with rapid drying and extreme register accuracy.",
            "Ultra Sonic" => "Cold ultrasonic label cutter sealing micro-fibers without harsh burrs or frayed edges, ideal for skin-contact innerwear labels.",
            "Paper Emboss" => "Hydraulic 3D embossing machine generating deep relief textures, tactile logos, and brand seal impressions.",
            "Heat Lamination" => "Thermal roll lamination system applying anti-scratch matte, gloss, and soft-touch velvet protective films.",
            _ => "State-of-the-art mechanized production equipment built for export-grade reliability."
        };
    }

    private void InitializeServices()
    {
        _services.AddRange(new List<ServiceItem>
        {
            new()
            {
                Id = 1,
                Slug = "manufacturing",
                Title = "Manufacturing",
                ShortDescription = "We are capable of manufacturing international standard apparel accessories and trims with state-of-the-art facilities.",
                FullDescription = "ZamZam Trims (BD) Limited runs fully equipped modern production floors designed for large-scale and precision manufacturing of apparel accessories and trims. Our cutting-edge infrastructure manufactures woven labels, care labels, twill tapes, drawstrings, buttons, elastics, and hang tags following strict international tolerances.",
                ImageUrl = "/images/services/ManufacturingService.jpg",
                IconClass = "bi-gear-wide-connected",
                Highlights = new() { "High-volume output capacity", "Export-standard compliance & OEKO-TEX adherence", "Custom mold, dye, and weave formulations", "Rigorous in-line quality assurance" }
            },
            new()
            {
                Id = 2,
                Slug = "digital-printing",
                Title = "Digital Printing",
                ShortDescription = "We have an excellent and advanced setup for digital printing solutions with supreme color fidelity.",
                FullDescription = "Our digital printing department is powered by latest-generation high-resolution digital presses capable of reproducing photo-realistic visuals, gradients, variable QR codes, and fine barcodes on diverse garment accessories, cards, and packaging substrates.",
                ImageUrl = "/images/services/DigitalPrintingService.jpg",
                IconClass = "bi-printer",
                Highlights = new() { "Variable data and serialized QR/Barcode printing", "Zero setup delay for rapid prototyping & short runs", "Eco-solvent, UV, and pigment ink technologies", "Micro-text clarity and pantone fidelity" }
            },
            new()
            {
                Id = 3,
                Slug = "apparel-labeling",
                Title = "Apparel Labeling Solutions",
                ShortDescription = "We provide comprehensive woven and care labeling solutions through manufacturing and tailored sourcing.",
                FullDescription = "Labels are the signature of brand identity. We craft ultra-soft damask woven labels, high-density satin badges, heat transfer neck labels, and multi-lingual wash care labels engineered to survive hundreds of commercial wash cycles while keeping skin irritation at zero.",
                ImageUrl = "/images/services/LabelingService.jpg",
                IconClass = "bi-tag",
                Highlights = new() { "Damask, Satin, Taffeta, and Recycled Polyester yarns", "Ultrasonic softness for zero neck irritation", "Multi-lingual compliance wash care formatting", "Thermal cut, ultrasonic cut, and custom folding" }
            },
            new()
            {
                Id = 4,
                Slug = "paper-embossing",
                Title = "Paper Embossing",
                ShortDescription = "Modern machineries for 3D tactile embossing and debossing on paper and apparel packaging products.",
                FullDescription = "Elevate packaging aesthetics with tactile 3D relief embossing. Our hydraulic embossing and foil stamping systems imprint multi-level dimensions, brand seals, crests, and textures onto heavy cardstock, hang tags, and presentation boxes.",
                ImageUrl = "/images/services/EmbossingService.jpg",
                IconClass = "bi-layers",
                Highlights = new() { "Single-level and sculptured multi-level 3D embossing", "Combination foil embossing in metallic and holographic foils", "Deep relief without cardstock cracking", "Custom micro-texture die casting" }
            },
            new()
            {
                Id = 5,
                Slug = "heat-pressing",
                Title = "Heat Pressing",
                ShortDescription = "Modern industrial machineries for heat press and thermal transfer applications on apparel items.",
                FullDescription = "Our thermal transfer and heat press lines offer precise digital temperature, dwell time, and pneumatic pressure control. We fuse high-definition heat transfers, reflective badges, silicone logos, and TPU emblems onto textiles with flawless wash-resistance.",
                ImageUrl = "/images/services/HeatPressService.jpg",
                IconClass = "bi-fire",
                Highlights = new() { "Pneumatic multi-head presses with digital temp sensors", "Seamless adherence to cotton, poly, and stretch blends", "Reflective, glow-in-dark, and silicone 3D emblems", "Tested against severe commercial laundry standards" }
            },
            new()
            {
                Id = 6,
                Slug = "laminating",
                Title = "Laminating Solutions",
                ShortDescription = "Advanced machinery for laminating paper, packaging cards, and apparel accessory boards.",
                FullDescription = "Protect and beautify hang tags and packaging with thermal roll lamination. Choose from velvety soft-touch matte, high-gloss shine, anti-scratch matte, pearlized textures, and moisture barrier films that maintain structural crispness.",
                ImageUrl = "/images/services/LaminationService.jpg",
                IconClass = "bi-shield-check",
                Highlights = new() { "Thermal anti-scratch matte and crystal gloss films", "Velvet soft-touch luxury tactile coatings", "Moisture and humidity barrier protection", "Zero bubbling, peeling, or corner delamination" }
            },
            new()
            {
                Id = 7,
                Slug = "direct-selling",
                Title = "Direct Selling & Ready Stock",
                ShortDescription = "Ready stock apparel accessories and trims products ready for immediate fulfillment.",
                FullDescription = "For time-critical garment production runs and immediate sampling requirements, we maintain substantial warehouses stocked with popular trims, zippers, basic buttons, elastic spools, gum tapes, and standard threads ready for immediate dispatch.",
                ImageUrl = "/images/services/DirectSellingService.jpg",
                IconClass = "bi-cart-check",
                Highlights = new() { "Thousands of ready-stock SKUs on standby", "Instant sample dispatch within 24 hours", "Bulk wholesale pricing structures", "Emergency inventory buffering for partner factories" }
            },
            new()
            {
                Id = 8,
                Slug = "packaging",
                Title = "Apparel Packaging Solutions",
                ShortDescription = "Modern setup for packaging garment accessories and trims with utmost safety and elegance.",
                FullDescription = "We produce retail-ready garment boxes, poly packaging, header cards, blister packs, and inner cartons. Every packaging solution is engineered to protect products during international transit while providing striking shelf appeal.",
                ImageUrl = "/images/services/PackagingService.jpg",
                IconClass = "bi-box-seam",
                Highlights = new() { "Corrugated boxes, display cartons & header cards", "Eco-friendly biodegradable polybags & cardboard trays", "Moisture-sealed master packaging for export cargo", "Custom brand color matching across all formats" }
            },
            new()
            {
                Id = 9,
                Slug = "sourcing",
                Title = "Global Vendor Sourcing",
                ShortDescription = "Expert procurement specialists and vetted vendors for specialized global trims and accessories.",
                FullDescription = "Need exotic trims, antique metal buttons, custom molded zippers, or rare textile tapes? Our experienced international sourcing division connects your buyers directly to vetted global manufacturing partners with transparent cost structures.",
                ImageUrl = "/images/services/SourcingService.jpg",
                IconClass = "bi-globe-americas",
                Highlights = new() { "Deep supply chain connections across Asia & Europe", "Direct factory price negotiation without middlemen", "Pre-shipment batch testing and compliance validation", "Seamless customs clearance and doorstep delivery" }
            },
            new()
            {
                Id = 10,
                Slug = "quick-shipping",
                Title = "Quick Shipping & Logistics",
                ShortDescription = "Agile and rapid shipping methods in both drop-shipping and direct factory-to-factory modes.",
                FullDescription = "Garment lead times are tight. Our logistics team operates dedicated delivery vehicles across Bangladesh garment hubs (Gazipur, Ashulia, Narayanganj, Chittagong, Dhaka) along with integrated air and sea freight coordination for global buyers.",
                ImageUrl = "/images/Shipping.jpg",
                IconClass = "bi-truck",
                Highlights = new() { "Direct daily van routes to all major industrial garment zones", "Real-time dispatch tracking and delivery proofs", "Drop-ship directly to subcontractors upon request", "Express export freight handling" }
            },
            new()
            {
                Id = 11,
                Slug = "customer-support",
                Title = "24x7 Dedicated Customer Support",
                ShortDescription = "Round-the-clock responsive customer support understanding your production urgencies.",
                FullDescription = "In the fast-moving garments apparel industry, questions can arise at any hour. Our dedicated account managers and technical merchandising support teams are available 24/7 to solve production queries, adjust order volumes, and track deliveries.",
                ImageUrl = "/images/services/ManufacturingService.jpg",
                IconClass = "bi-headset",
                Highlights = new() { "Dedicated merchandising account managers", "Instant WhatsApp and direct telephone responsiveness", "Transparent digital order status tracking", "Prompt revision sampling and design consultations" }
            }
        });
    }

    private void InitializeTeam()
    {
        _team.AddRange(new List<TeamMember>
        {
            new()
            {
                Id = 1,
                Name = "Mahadi Hasan",
                Role = "Deputy Managing Director",
                ImageUrl = "/images/team/Mahadi.jpg",
                Bio = "Strategic leader driving ZamZam Trims (BD) Limited toward manufacturing excellence, advanced automation, and long-term sustainable client partnerships across international garment export industries."
            },
            new()
            {
                Id = 2,
                Name = "MD. Tareq Howlader",
                Role = "Director",
                ImageUrl = "/images/team/Tareq.jpg",
                Bio = "Directs operational efficiency, technology acquisition, and machinery modernization, ensuring our mechanized facilities consistently deliver precision-crafted accessories on time."
            },
            new()
            {
                Id = 3,
                Name = "Shahdat Hosen",
                Role = "Director",
                ImageUrl = "/images/team/Shahdat.jpg",
                Bio = "Oversees supply chain synchronization, procurement networks, and client relationship management, providing competitive pricing, reliable stock, and 24/7 client satisfaction."
            }
        });
    }

    private void InitializeProcessSteps()
    {
        _processSteps.AddRange(new List<ProcessStep>
        {
            new()
            {
                StepNumber = 1,
                Title = "Planning",
                Subtitle = "Sales Order Planning & Technical Analysis",
                Description = "We analyze sales order items based on client requirements with maximum agility. Our expert planners evaluate optimal materials and production paths to achieve superior quality within the customer's budget.",
                ImageUrl = "/images/Planning.jpg",
                Checkpoints = new()
                {
                    "Collect sales order items details & technical spec sheets from the customer.",
                    "Analyze sales order items costing, material yields, and competitive pricing.",
                    "Validate sample swatch, color specs, and quality standards with the buyer.",
                    "Submit finalized sales order plan to the mechanized order processing unit.",
                    "Validate sales order item consumption ratios and raw inventory reserves.",
                    "Formulate realistic sales order item delivery and shipping timeline."
                }
            },
            new()
            {
                StepNumber = 2,
                Title = "Processing",
                Subtitle = "Precision Manufacturing & Quality Control",
                Description = "Our production and procurement divisions execute the sales order based on the validated plan, strictly adhering to shipping deadlines and international quality parameters.",
                ImageUrl = "/images/Processing.jpg",
                Checkpoints = new()
                {
                    "Direct sales order items are picked and staged immediately per schedule.",
                    "Custom production sales orders routed to automated high-precision machinery.",
                    "Continuous sync with customer on real-time production milestone progress.",
                    "Multi-tier Quality Control (QC) inspection team validates tolerances before dispatch.",
                    "Dedicated packaging unit packs finished items ensuring maximum transit care.",
                    "Handover finished, inspected goods to the central shipping and logistics division."
                }
            },
            new()
            {
                StepNumber = 3,
                Title = "Shipping",
                Subtitle = "Safe, Tracked & On-Time Delivery",
                Description = "We maintain versatile logistics capabilities to transport customer orders directly to factory doorsteps or export hubs safely and swiftly.",
                ImageUrl = "/images/Shipping.jpg",
                Checkpoints = new()
                {
                    "Doorstep delivery fleet servicing all major RMG industrial clusters in Bangladesh.",
                    "Transparent shipping terms, waybill paperwork, and customs compliance.",
                    "Continuous end-to-end consignment tracking until verified customer handover.",
                    "Seamless coordination with buyer's nominated logistics or freight forwarders."
                }
            }
        });
    }

    public List<Product> GetAllProducts() => _products;

    public List<Product> GetFeaturedProducts() => _products.Where(p => p.IsFeatured).Take(12).ToList();

    public Product? GetProductById(int id) => _products.FirstOrDefault(p => p.Id == id);

    public List<Machinery> GetAllMachineries() => _machineries;

    public Machinery? GetMachineryById(int id) => _machineries.FirstOrDefault(m => m.Id == id);

    public List<ServiceItem> GetAllServices() => _services;

    public ServiceItem? GetServiceBySlug(string slug) => _services.FirstOrDefault(s => s.Slug.Equals(slug, StringComparison.OrdinalIgnoreCase));

    public List<TeamMember> GetTeamMembers() => _team;

    public List<ProcessStep> GetProcessSteps() => _processSteps;
}
