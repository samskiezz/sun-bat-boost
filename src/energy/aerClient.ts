// AER PRD (Energy Made Easy) API Client
// Fetches official energy plan data from Consumer Data Right endpoints

import { AER_RETAILERS } from "./aerRetailers";

const CDR_HEADERS = { 
  "x-v": "1", 
  "x-min-v": "1", 
  "accept": "application/json",
  "user-agent": "Hilts-Energy-Intelligence/1.0"
};

type GenericPlansParams = {
  fuelType?: "ELECTRICITY" | "GAS" | "ALL";
  type?: "ALL" | "RESIDENTIAL" | "BUSINESS";
  effective?: "CURRENT" | "ALL";
  page?: number;
  "page-size"?: number;
  state?: string;     // filter by jurisdiction
  postcode?: string;  // for availability check
  brand?: string;     // specific retailer filter
};

export async function fetchAllGenericPlans(
  params: Omit<GenericPlansParams, "page" | "page-size"> = {}
): Promise<any[]> {
  const allPlans: any[] = [];
  const retailers = params.brand
    ? AER_RETAILERS.filter(r => r.brand === params.brand)
    : AER_RETAILERS;

  console.log(`Fetching plans from ${retailers.length} retailers...`);

  for (const retailer of retailers) {
    try {
      let page = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        const queryParams = new URLSearchParams({
          fuelType: params.fuelType ?? "ELECTRICITY",
          type: params.type ?? "RESIDENTIAL",
          effective: params.effective ?? "CURRENT",
          page: String(page),
          "page-size": "1000", // max allowed
          ...(params.state && { state: params.state }),
          ...(params.postcode && { postcode: params.postcode }),
        });

        const url = `${retailer.baseUri}/cds-au/v1/energy/plans?${queryParams}`;
        console.log(`Fetching: ${retailer.displayName || retailer.brand} - Page ${page}`);

        const response = await fetch(url, { 
          headers: CDR_HEADERS,
          signal: AbortSignal.timeout(30000) // 30s timeout
        });

        if (!response.ok) {
          console.warn(`AER PRD error ${response.status} for ${retailer.brand}: ${response.statusText}`);
          break; // Skip this retailer, continue with others
        }

        const data = await response.json();
        const plans = data?.data?.plans || data?.data || data?.plans || [];
        
        if (plans.length > 0) {
          // Add retailer metadata to each plan
          const plansWithMeta = plans.map((plan: any) => ({
            ...plan,
            _retailer_brand: retailer.brand,
            _retailer_display_name: retailer.displayName || retailer.brand,
            _fetch_timestamp: new Date().toISOString()
          }));
          
          allPlans.push(...plansWithMeta);
          console.log(`  → Found ${plans.length} plans`);
        }

        // Check pagination
        const meta = data?.meta || {};
        const totalPages = Number(meta?.totalPages || 1);
        const currentPage = Number(meta?.page || page);
        
        hasMorePages = currentPage < totalPages && plans.length > 0;
        page++;

        // Rate limiting - small delay between requests
        if (hasMorePages) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error(`Failed to fetch plans from ${retailer.brand}:`, error);
      // Continue with other retailers
    }
  }

  console.log(`Total plans fetched: ${allPlans.length}`);
  return allPlans;
}

// Fetch detailed plan information (uses v3 endpoint)
export async function fetchPlanDetail(planId: string, retailerBrand: string): Promise<any | null> {
  const retailer = AER_RETAILERS.find(r => r.brand === retailerBrand);
  if (!retailer) {
    console.warn(`Unknown retailer brand: ${retailerBrand}`);
    return null;
  }

  try {
    const url = `${retailer.baseUri}/cds-au/v3/energy/plans/${planId}`;
    const response = await fetch(url, { 
      headers: { 
        ...CDR_HEADERS, 
        "x-v": "3", 
        "x-min-v": "3" 
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.warn(`Failed to fetch plan detail for ${planId}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data?.data || data;
  } catch (error) {
    console.error(`Error fetching plan detail for ${planId}:`, error);
    return null;
  }
}