using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace WebApplication1.Models
{
	public struct Tolerance
	{
		public const double DIST_TOL = 0.001;
	}
	public enum Support
	{
		FREE, HINGE, ROLLER, FIXED
	}
	public enum LoadPattern
	{
		DEAD, LIVE, WIND, COMBINATION
	}
	public enum Compactness
	{
		COMPACT, NONCOMPACT, SLENDER
	}
	public enum UnSupportedLength
	{
		SUPPORTED, UNSUPPORTED
	}
	public enum BeamType
	{
		FLOOR, CRANE, PURLIN
	}
	public enum StressType
	{
		FLEXURAL, AXIAL, COMBINED
	}
	public enum BracingCondition
	{
		BRACED, UNBRACED
	}
	public enum SteelType
	{
		ST_37, ST_44, ST_52
	}

}
