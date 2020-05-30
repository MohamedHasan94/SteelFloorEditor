using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Numerics;
namespace WebApplication1.Models
{
    public class Model
    {
        public List<Node> Nodes { get; set; }

        public List<Section> Sections { get; set; }

        public List<Beam> SecondaryBeams { get; set; }

        public List<Beam> MainBeams { get; set; }

        public List<Column> Columns { get; set; }
    }

    public class Position
    {
        public float X { get; set; }
        public float Y { get; set; }
        public float Z { get; set; }
    }

    public class Node
    {
        public string Support { get; set; }

        public Position Position { get; set; }

        public List<Load> Loads { get; set; }
    }

    public class Loads
    {
        public Load Dead { get; set; }
        public Load Live { get; set; }
    }

    public class Load
    {
        public string Type { get; set; }
        public string LoadCase { get; set; }
        public float Value { get; set; }
    }

    public class Beam
    {
        public Section Section { get; set; }

        public Position StartPoint { get; set; }
        public Position EndPoint { get; set; }

        public Node StartNode { get; set; }
        public Node EndNode { get; set; }

        public float Span { get; set; }

        public List<Load> Loads { get; set; }

        public List<Node> InnerNodes { get; set; }
    }

    public class Column
    {
        public Section Section { get; set; }

        public Position StartPoint { get; set; }
        public Position EndPoint { get; set; }

        public Node StartNode { get; set; }
        public Node EndNode { get; set; }

        public float Height { get; set; }

        public List<Load> Loads { get; set; }

        //public List<Node> InnerNodes { get; set; }
    }

    public class Section
    {
        public string Name { get; set; }
        public double W { get; set; }
        public double A { get; set; }
        public double H { get; set; }
        public double B { get; set; }
        public double TW { get; set; }
        public double TF { get; set; }
        public double IX { get; set; }
        public double TY { get; set; }
    }
}
