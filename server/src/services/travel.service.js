import { TravelRequest } from '../models/ExpenseEcosystem.js';
import { User } from '../models/User.js';
import axios from 'axios';
import { requestAssetAssignmentsForTravel } from './assetIntegration.service.js';

const nextTravelId = () => `TRV-${Date.now().toString(36).toUpperCase()}`;

const CITY_RATES = {
  ahmedabad: { tier: 2, hotel: 3200, meals: 900, taxi: 900 },
  mumbai: { tier: 1, hotel: 5800, meals: 1400, taxi: 1800 },
  delhi: { tier: 1, hotel: 5600, meals: 1350, taxi: 1700 },
  bengaluru: { tier: 1, hotel: 5400, meals: 1300, taxi: 1600 },
  pune: { tier: 2, hotel: 4200, meals: 1100, taxi: 1200 },
  hyderabad: { tier: 1, hotel: 5000, meals: 1250, taxi: 1500 },
  chennai: { tier: 1, hotel: 5000, meals: 1250, taxi: 1500 },
  kolkata: { tier: 2, hotel: 4300, meals: 1100, taxi: 1200 },
  jaipur: { tier: 2, hotel: 3600, meals: 1000, taxi: 1000 },
  surat: { tier: 2, hotel: 3300, meals: 900, taxi: 900 }
};

const iataCodes = {
  "ahmedabad": "AMD",
  "surat": "STV",
  "mumbai": "BOM",
  "vadodara": "BDQ"
};

const fallbackDistances = {
  'ahmedabad-surat': 265,
  'surat-ahmedabad': 265,
  'ahmedabad-mumbai': 525,
  'mumbai-ahmedabad': 525,
  'ahmedabad-vadodara': 110,
  'vadodara-ahmedabad': 110,
  'surat-mumbai': 280,
  'mumbai-surat': 280,
  'surat-vadodara': 150,
  'vadodara-surat': 150,
  'mumbai-vadodara': 415,
  'vadodara-mumbai': 415
};

const OPENROUTESERVICE_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImFmYmJkNmZhMTBlMzQxNDFhYTZjMTg4ZjBmNGJhODJhIiwiaCI6Im11cm11cjY0In0=';
const DUFFEL_API_KEY = 'duffel_test_rNORG4pU6n5_yoZ038WAmtZQ161jWIjXtvKY4irPDJJ';

const normalizeCity = (value = '') => String(value).trim().toLowerCase();

const daysBetween = (start, end) => {
  if (!start || !end) return 1;
  const diff = Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1;
  return Math.max(1, diff || 1);
};

const getCityRate = (city, travelType) => {
  if (travelType === 'international') return { tier: 'intl', hotel: 12000, meals: 3500, taxi: 3500 };
  return CITY_RATES[normalizeCity(city)] || { tier: 3, hotel: 3000, meals: 850, taxi: 800 };
};

// Helper to fetch coordinates from OpenRouteService Geocoding API
async function getCoordinates(city, apiKey) {
  try {
    const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(city)}&limit=1`;
    const response = await axios.get(url);
    if (response.data && response.data.features && response.data.features.length > 0) {
      const [lon, lat] = response.data.features[0].geometry.coordinates;
      return { lon, lat };
    }
  } catch (err) {
    console.warn("Geocoding failed for city:", city, err.message);
  }
  return null;
}

// Helper to fetch driving distance from OpenRouteService Directions API
async function getDrivingDistance(fromCoords, toCoords, apiKey) {
  try {
    const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${fromCoords.lon},${fromCoords.lat}&end=${toCoords.lon},${toCoords.lat}`;
    const response = await axios.get(url);
    if (response.data && response.data.features && response.data.features.length > 0) {
      const distanceInMeters = response.data.features[0].properties.summary.distance;
      return distanceInMeters / 1000; // convert to km
    }
  } catch (err) {
    console.warn("Directions API failed:", err.message);
  }
  return null;
}

export const estimateTravelRequest = async ({ payload = {}, user }) => {
  const travelType = payload.travelType || 'domestic';
  const days = daysBetween(payload.startDate, payload.endDate);
  const nights = Math.max(0, days - 1);
  const destinationRate = getCityRate(payload.destination, travelType);
  const transportMode = payload.transportMode || payload.booking?.transportMode || 'Flight';

  // 1. Calculate actual distance dynamically using ORS
  let distance = 265; // Default fallback
  const sourceCity = payload.source || "";
  const destCity = payload.destination || "";
  
  if (sourceCity && destCity && sourceCity.toLowerCase() !== destCity.toLowerCase()) {
    const fromCoords = await getCoordinates(sourceCity, OPENROUTESERVICE_API_KEY);
    const toCoords = await getCoordinates(destCity, OPENROUTESERVICE_API_KEY);
    if (fromCoords && toCoords) {
      const orsDistance = await getDrivingDistance(fromCoords, toCoords, OPENROUTESERVICE_API_KEY);
      if (orsDistance !== null) {
        distance = orsDistance;
      }
    } else {
      const fallbackKey = `${sourceCity.toLowerCase()}-${destCity.toLowerCase()}`;
      if (fallbackDistances[fallbackKey]) {
        distance = fallbackDistances[fallbackKey];
      }
    }
  }

  // 2. Class multiplier
  const classMultiplier = payload.travelClass === 'Business' ? 2.6 : payload.travelClass === 'Premium Economy' ? 1.45 : payload.travelClass === 'First' ? 4 : 1;

  // 3. Ticket Estimate calculation
  let ticketEstimate = 0;

  if (Number(payload.ticketEstimate) > 0) {
    ticketEstimate = Math.round(Number(payload.ticketEstimate));
  } else {
    if (transportMode === 'Flight') {
      // Fetch dynamic flight price from Duffel API
      const fromIata = iataCodes[sourceCity.toLowerCase()];
      const toIata = iataCodes[destCity.toLowerCase()];
      let flightPrice = null;
      
      if (fromIata && toIata) {
        try {
          const duffelResponse = await axios.post(
            'https://api.duffel.com/air/offer_requests',
            {
              data: {
                slices: [{ origin: fromIata, destination: toIata, departure_date: '2026-06-15' }],
                passengers: [{ type: 'adult' }],
                cabin_class: 'economy'
              }
            },
            {
              headers: {
                'Authorization': `Bearer ${DUFFEL_API_KEY}`,
                'Duffel-Version': 'v1',
                'Content-Type': 'application/json'
              }
            }
          );
          const offers = duffelResponse.data?.data?.offers || [];
          if (offers.length > 0) {
            offers.sort((a, b) => parseFloat(a.total_amount) - parseFloat(b.total_amount));
            flightPrice = Math.round(parseFloat(offers[0].total_amount));
          }
        } catch (duffelError) {
          console.warn("Duffel flight search failed in travel request estimate:", duffelError.message);
        }
      }
      
      if (flightPrice !== null) {
        ticketEstimate = Math.round(flightPrice * classMultiplier);
      } else {
        // Baseline estimate
        ticketEstimate = Math.round(Math.max(3500, distance * 12) * classMultiplier);
      }
    } else if (transportMode === 'Train') {
      // Dynamic train estimation based on distance
      ticketEstimate = Math.round(distance * 2 * classMultiplier);
    } else if (transportMode === 'Cab' || transportMode === 'Personal Vehicle') {
      const rate = transportMode === 'Cab' ? 14 : 3;
      ticketEstimate = Math.round(distance * rate);
    } else if (transportMode === 'Bus') {
      ticketEstimate = Math.round(distance * 2);
    } else {
      ticketEstimate = 1500;
    }
  }

  const hotelCost = Math.round(Number(payload.hotelCost || 0) || destinationRate.hotel);
  const mealLimit = Math.round(Number(payload.dailyMealLimit || 0) || destinationRate.meals);
  const localTransport = Math.round(destinationRate.taxi * days);
  const stayAllowance = hotelCost * nights;
  const mealAllowance = mealLimit * days;
  const estimatedTotal = ticketEstimate + stayAllowance + mealAllowance + localTransport;
  const policyAllowedBudget = travelType === 'international' ? 350000 : destinationRate.tier === 1 ? 175000 : 125000;
  const advanceEligible = Math.round(Math.min(estimatedTotal * 0.6, travelType === 'international' ? 150000 : 75000));
  const departmentAnnualBudget = user?.department === 'Finance' ? 300000 : user?.department === 'Operations' ? 400000 : 500000;
  const departmentBudgetRemaining = Math.max(0, departmentAnnualBudget - estimatedTotal);

  const policyAlerts = [];
  if (payload.travelClass && payload.travelClass !== 'Economy') policyAlerts.push({ code: 'TRAVEL_CLASS', title: 'Travel class requires approval', detail: `Selected class ${payload.travelClass}; standard policy allows Economy.`, severity: 'warning' });
  if (hotelCost > (travelType === 'international' ? 15000 : 5000)) policyAlerts.push({ code: 'HOTEL_LIMIT', title: 'Hotel estimate exceeds limit', detail: `Hotel estimate is ${hotelCost}/night.`, severity: 'warning' });
  if (mealLimit > (travelType === 'international' ? 4000 : 1500)) policyAlerts.push({ code: 'MEAL_LIMIT', title: 'Meal allowance exceeds limit', detail: `Daily meal allowance is ${mealLimit}.`, severity: 'warning' });
  if (estimatedTotal > policyAllowedBudget) policyAlerts.push({ code: 'BUDGET_LIMIT', title: 'Estimated trip budget exceeds policy', detail: `Estimated total exceeds allowed budget.`, severity: 'high' });
  if (travelType === 'international') policyAlerts.push({ code: 'INTERNATIONAL_APPROVAL', title: 'International travel approval required', detail: 'Director/CFO approval will be included.', severity: 'warning' });
  if (payload.startDate && [0, 6].includes(new Date(payload.startDate).getDay())) policyAlerts.push({ code: 'WEEKEND_TRAVEL', title: 'Weekend travel justification required', detail: 'Start date falls on a weekend.', severity: 'warning' });

  return {
    days,
    nights,
    ticketEstimate,
    hotelCost,
    mealLimit,
    localTransport,
    stayAllowance,
    mealAllowance,
    estimatedTotal,
    policyAllowedBudget,
    departmentBudgetRemaining,
    advanceEligible,
    currency: 'INR',
    policyAlerts,
    source: 'policy_rate_card'
  };
};

const buildApprovalPath = ({ status, managerId }) => {
  if (status !== 'SUBMITTED') return [];
  const path = [
    { approverRole: 'manager', approverId: managerId, status: 'pending' },
    { approverRole: 'finance', status: 'pending' }
  ];
  return path;
};

export const createTravelRequest = async ({ req, payload }) => {
  const estimate = await estimateTravelRequest({ payload, user: req.user });
  const status = payload.status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT';
  const approvalPath = buildApprovalPath({ status, managerId: req.user.managerId });
  const request = await TravelRequest.create({
    ...payload,
    companyId: req.companyId,
    employeeId: req.user._id,
    travelId: nextTravelId(),
    createdBy: req.user._id,
    updatedBy: req.user._id,
    department: payload.department || req.user.department,
    budget: {
      amount: Number(payload.budget?.amount || payload.estimatedCost || estimate.estimatedTotal || 0),
      currency: payload.budget?.currency || payload.currency || 'INR'
    },
    estimate,
    policyAlerts: estimate.policyAlerts,
    assetRequests: Array.isArray(payload.assetRequests) ? payload.assetRequests : [],
    assetAllocation: {
      status: Array.isArray(payload.assetRequests) && payload.assetRequests.length ? 'pending' : 'not_requested'
    },
    status: status === 'SUBMITTED' ? 'PENDING_MANAGER' : 'DRAFT',
    approvalPath,
    timeline: [{ status: status === 'SUBMITTED' ? 'PENDING_MANAGER' : 'DRAFT', action: status === 'SUBMITTED' ? 'submitted' : 'draft_saved', actorId: req.user._id, at: new Date() }]
  });
  return request;
};

export const listTravelRequestsForUser = async ({ req }) => {
  const filter = { companyId: req.companyId };
  if (req.user.role === 'employee') filter.employeeId = req.user._id;
  if (req.user.role === 'manager') {
    const team = await User.find({ companyId: req.companyId, managerId: req.user._id, status: 'active' }).select('_id').lean();
    filter.employeeId = { $in: [req.user._id, ...team.map((user) => user._id)] };
  }
  return TravelRequest.find(filter).populate('employeeId', 'name email department managerId role').sort({ createdAt: -1 });
};

export const actOnTravelRequest = async ({ req, id, action, note }) => {
  const trip = await TravelRequest.findOne({ _id: id, companyId: req.companyId }).populate('employeeId', 'name email department managerId');
  if (!trip) return null;
  const pending = trip.approvalPath.find((step) => step.status === 'pending');
  const allowedRole = pending?.approverRole;
  const canAct = req.user.role === 'company_admin' || req.user.role === 'super_admin' || req.user.role === allowedRole;
  const isTeamManager = req.user.role !== 'manager' || String(trip.employeeId?.managerId || '') === String(req.user._id) || String(trip.employeeId?._id || trip.employeeId) === String(req.user._id);
  if (!canAct || !isTeamManager) return null;

  if (pending) {
    pending.status = action === 'approve' ? 'approved' : action === 'send_back' ? 'sent_back' : 'rejected';
    pending.approverId = req.user._id;
    pending.actedAt = new Date();
    pending.note = note;
  }

  if (action === 'reject') trip.status = 'REJECTED';
  else if (action === 'send_back') trip.status = 'DRAFT';
  else {
    const nextPending = trip.approvalPath.find((step) => step.status === 'pending');
    trip.status = nextPending ? `PENDING_${String(nextPending.approverRole).toUpperCase()}` : 'APPROVED';
  }

  trip.updatedBy = req.user._id;
  trip.timeline.push({ status: trip.status, action, actorId: req.user._id, note, at: new Date() });

  if (trip.status === 'APPROVED' && Array.isArray(trip.assetRequests) && trip.assetRequests.length) {
    try {
      const assignment = await requestAssetAssignmentsForTravel({ trip });
      const assignedIds = new Set((assignment?.assignments || []).filter((item) => item.assigned).map((item) => String(item.assetId)));
      trip.assetRequests.forEach((asset) => {
        asset.status = assignedIds.has(String(asset.assetId)) ? 'assigned' : 'failed';
      });
      const failedCount = trip.assetRequests.filter((asset) => asset.status === 'failed').length;
      trip.assetAllocation = {
        status: failedCount ? (failedCount === trip.assetRequests.length ? 'failed' : 'partial') : 'assigned',
        assignedAt: new Date(),
        response: assignment,
        error: failedCount ? 'Some travel assets could not be assigned' : ''
      };
      trip.timeline.push({
        status: trip.status,
        action: 'travel_assets_assigned',
        actorId: req.user._id,
        note: failedCount ? 'Some travel assets could not be assigned.' : 'Travel assets assigned in Asset Management.',
        at: new Date()
      });
    } catch (error) {
      trip.assetRequests.forEach((asset) => {
        asset.status = 'failed';
      });
      trip.assetAllocation = {
        status: 'failed',
        response: null,
        error: error.message
      };
      trip.timeline.push({
        status: trip.status,
        action: 'travel_asset_assignment_failed',
        actorId: req.user._id,
        note: error.message,
        at: new Date()
      });
    }
  }

  await trip.save();
  return trip;
};

export const settleTravelRequest = async ({ request, expenses }) => {
  const total = expenses.reduce((sum, expense) => sum + Number(expense.convertedAmount || expense.amount || 0), 0);
  request.status = 'SETTLED';
  request.linkedExpenses = expenses.map((expense) => expense._id);
  request.actualSpend = { amount: total, currency: request.budget?.currency || 'INR' };
  await request.save();
  return request;
};
