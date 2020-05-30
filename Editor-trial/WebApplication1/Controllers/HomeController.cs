using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using WebApplication1.Models;
using System.IO;
using System.Text;
using Microsoft.AspNetCore.Http.Internal;

namespace WebApplication1.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }

        public IActionResult About()
        {
            ViewData["Message"] = "Your application description page.";

            return View();
        }

        public IActionResult Contact()
        {
            ViewData["Message"] = "Your contact page.";

            return View();
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }

        public IActionResult Editor()
        {
            return View();
        }

        [HttpPost]
        public string Solve([FromBody] Model model)
        {
            /*model.Sections[1].Name = "IPE 750";    

            model.Nodes[0].Position.X = 100; 
            model.Nodes[0].Position.Y = 200; 
            model.Nodes[0].Position.Z = 300;*/

            return "Hola";
        }

        [HttpPost]
        public string Read()
        {
            //Request.EnableRewind();

            using (var reader = new StreamReader(Request.Body, Encoding.UTF8))
            {
                using (var writer = new StreamWriter("./wwwroot/Text.json"))
                {
                    writer.Write(reader.ReadToEnd());
                }
            }

            return "Hola";
        }
    }
}
