using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace WebApplication1.Models
{

    public class Model
    {
        public ProjectProperties ProjectProperties { get; set; }
        public List<Node> Nodes { get; set; }


        public Material Material { get; set; }
        public List<Section> Sections { get; set; }

        public List<Beam> SecondaryBeams { get; set; }
        public List<Beam> MainBeams { get; set; }

        public List<Column> Columns { get; set; }
    }

    public struct ProjectProperties
    {
        public string Number { get; set; }
        public string Name { get; set; }
        public string Designer { get; set; }
        public string Location { get; set; }
        public string City { get; set; }
        public string Country { get; set; }
    }
    #region Node
    public class Point
    {
        public Point(double x, double y, double z)
        {
            X = x;
            Y = y;
            Z = z;
        }
        public double X { get; set; }
        public double Y { get; set; }
        public double Z { get; set; }

        public double Distance(Point p)
        {
            double dx = X - p.X;
            double dy = Y - p.Y;
            double dz = Z - p.Z;
            return Math.Sqrt(dx * dx + dy * dy + dz * dz);
        }
    }
    public class Node
    {
        public Point Position { get; set; }
        public List<PointLoad> PointLoads { get; set; }

        //public Support Support { get; set; }
    }
    #endregion


    #region Load
    public abstract class Load
    {
        public double Magnitude { get; set; }
        public LoadPattern Pattern { get; set; }

        public Load()
        {

        }
        public Load(double mag, LoadPattern pattern)
        {
            Magnitude = mag;
            Pattern = pattern;
        
        }
        //copy constructor
        public Load(Load other) : this(other.Magnitude, other.Pattern) { }

        public virtual Load Clone() => null;
    }
    public class LineLoad : Load
    {

        public LineLoad()
        {}
        public LineLoad(double mag, LoadPattern pattern) : base(mag, pattern) { }
        public LineLoad(LineLoad other) : base(other) { }
        public override Load Clone() => new LineLoad(this);
        public static List<LineLoad> CreateZeroLineLoadList(List<LoadPattern> patterns)
        {
            List<LineLoad> loads = new List<LineLoad>();
            foreach (var pattern in patterns)
            {
                loads.Add(new LineLoad(0, pattern));
            }
            return loads;
        }
    }
    public class PointLoad : Load
    {
        public PointLoad()
        { }
        public PointLoad(double mag, LoadPattern pattern) : base(mag, pattern) { }
        public PointLoad(PointLoad other) : base(other) { }
        public override Load Clone() => new PointLoad(this);
        public static List<PointLoad> CreateZeroPointLoadList(List<LoadPattern> patterns)
        {
            List<PointLoad> loads = new List<PointLoad>();
            foreach (var pattern in patterns)
            {
                loads.Add(new PointLoad(0, pattern));
            }
            return loads;
        }
    }
    #endregion


    #region Section
    public class Section
    {
        public int Id { get; set; }
        public string Name { get; set; }
        //Section Dimensions
        public double H { get; set; }
        public double B { get; set; }
        public double Tw { get; set; }
        public double Tf { get; set; }
        //section properties
        public double Area { get; set; }
        public double Ix { get; set; }
        public double Sx { get; set; }
        public double Rx { get; set; }
        public double Iy { get; set; }
        public double Sy { get; set; }
        public double Ry { get; set; }
        //Material
        public double W { get; set; }
        public Material Material { get; set; }
        //helper properties
        public double DwTw { get; set; } //dw/tw
        public double CTf { get; set; }   //c/tf
    }
    #endregion


    #region Material
    public class Material
    {
        #region Properties
        public SteelType Name { get; set; }
        public double E { get; set; }
        public double Fy { get; set; }
        public double Fu { get; set; }
        public double Density { get; set; }
        #endregion
        #region Constructor
        public Material()
        {

        }
        public Material(SteelType name, double fy, double fu, double e, double density) //TODO: ask team
        {
            Name = name;
            Fy = fy;
            Fu = fu;
            E = e;
            Density = density;
        }
        #endregion
    }
    #endregion
    #region FrameElement
    public class FrameElement
    {
        public FrameElement()
        {
            StrainingActions = new List<StrainingAction>();
            CombinedSA = new List<StrainingAction>();
        }
        public int Id { get; set; }
        public Node StartNode { get; set; }
        public Node EndNode { get; set; }
        public Section Section { get; set; }
        public Node LocalStartNode { get; set; }
        public Node LocalEndNode { get; set; }
        public List<LineLoad> LineLoads { get; set; }
        public List<Node> InnerNodes { get; set; }
        public List<StrainingAction> StrainingActions { get; set; }
        public List<StrainingAction> CombinedSA { get; set; }
        public double Length { get; set; }


    }
    public class Beam : FrameElement
    {
        #region Sorting
        public static IComparer<Beam> SortMomentDescendingly() => new CompareByM();
        class CompareByM : IComparer<Beam>
        {
            public int Compare(Beam x, Beam y)
            {
                x.CombinedSA.Sort(StrainingAction.SortMomentDescendingly());
                Station a = x.CombinedSA[0].Stations[0];
                y.CombinedSA.Sort(StrainingAction.SortMomentDescendingly());
                Station b = y.CombinedSA[0].Stations[0];
                if (Math.Abs(a.Mo) > Math.Abs(b.Mo))
                {
                    return -1;
                }
                else if (a.Mo < b.Mo)
                {
                    return 1;
                }
                else
                {
                    return 0;
                }
            }
        }
        #endregion

    }
    public class Column : FrameElement
    {
        public static IComparer<Column> SortNormalAscendingly() => new CompareByN();
        class CompareByN : IComparer<Column>
        {
            public int Compare(Column x, Column y)
            {
                x.CombinedSA.Sort(StrainingAction.SortNormalAscendingly());
                Station a = x.CombinedSA[0].Stations[0];
                y.CombinedSA.Sort(StrainingAction.SortNormalAscendingly());
                Station b = y.CombinedSA[0].Stations[0];
                if (a.No < b.No) return -1;
                else if (a.No > b.No) return 1;
                else return 0;
            }
        }

    }
    #endregion

    #region SA
    public class StrainingAction
    {
        #region Constructor
        public StrainingAction()
        {
            Stations = new List<Station>();
        }
        #endregion
        //public LoadCombination Combo { get; set; }
        public LoadPattern Pattern { get; set; }
        public List<Station> Stations { get; set; }

        public double GetMaxShear() => Stations.Max(s => s.GetMaxShear());

        #region Sorting Methods
        public static IComparer<StrainingAction> SortMomentDescendingly() => new CompareByM();
        public static IComparer<StrainingAction> SortNormalAscendingly() => new CompareByN();

        class CompareByN : IComparer<StrainingAction>
        {
            public int Compare(StrainingAction x, StrainingAction y)
            {
                x.Stations.Sort(Station.SortNormalAscendingly());
                Station a = x.Stations[0];
                y.Stations.Sort(Station.SortNormalAscendingly());
                Station b = y.Stations[0];
                if (a.No < b.No) return -1;
                else if (a.No > b.No) return 1;
                else return 0;
            }
        }

        class CompareByM : IComparer<StrainingAction>
        {
            public int Compare(StrainingAction x, StrainingAction y)
            {
                x.Stations.Sort(Station.SortMomentDescendingly());
                Station a = x.Stations[0];
                y.Stations.Sort(Station.SortMomentDescendingly());
                Station b = y.Stations[0];
                if (Math.Abs(a.Mo) > Math.Abs(b.Mo))
                {
                    return -1;
                }
                else if (a.Mo < b.Mo)
                {
                    return 1;
                }
                else
                {
                    return 0;
                }
            }
        }
        #endregion


    }
    #endregion

    #region STation
    public class Station
    {
        public double X { get; set; }
        public double Mo { get; set; }
        public double No { get; set; }
        public double Vo { get; set; }
        public double Vf { get; set; }

        public double GetMaxShear() => Math.Max(Math.Abs(Vo), Math.Abs(Vf));
        #region Sorting
        public static IComparer<Station> SortMomentDescendingly() => new CompareByM();
        public static IComparer<Station> SortNormalAscendingly() => new CompareByN();
        class CompareByN : IComparer<Station>
        {
            public int Compare(Station x, Station y)
            {
                //Sort Normal ascendingly from smallest to largest (from compression to tension) beacause basically compression is with negative value
                if (x.No < y.No) return -1;
                else if (x.No > y.No) return 1;
                else return 0;
            }
        }
        class CompareByM : IComparer<Station>
        {
            //sort stations descendingly by moment
            public int Compare(Station x, Station y)
            {
                if (Math.Abs(x.Mo) > Math.Abs(y.Mo))
                {
                    return -1;
                }
                else if (x.Mo < y.Mo)
                {
                    return 1;
                }
                else
                {
                    return 0;
                }
            }
        }
        #endregion



    }
    #endregion
}
