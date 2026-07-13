import { useEffect, useMemo, useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  Gauge,
  Hotel,
  Landmark,
  MapPinned,
  MapPin,
  Plane,
  Plus,
  ReceiptText,
  Route,
  Send,
  ShieldCheck,
  Sparkles,
  Train,
  WalletCards,
  X,
  Search,
  ChevronDown,
  Compass,
  Map,
  Navigation,
  Globe
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Drawer } from '../../components/common/Drawer';
import { EmptyState } from '../../components/common/EmptyState';
import { PageHeader } from '../../components/common/PageHeader';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DataTable } from '../../components/tables/DataTable';
import { api } from '../../services/platform.service';
import { usePermission } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = ['Basic Details', 'Booking', 'Budget & Advance', 'Policy', 'Approval', 'Review'];
const money = (amount, currency = 'INR') => `${currency === 'INR' ? '₹' : currency} ${Number(amount || 0).toLocaleString('en-IN')}`;
const today = new Date().toISOString().slice(0, 10);
const chartColor = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626'];

const initialForm = {
  title: '',
  purpose: 'Customer meeting',
  businessJustification: '',
  employeeName: '',
  department: '',
  travelType: 'domestic',
  clientName: '',
  projectCode: '',
  costCenter: '',
  startDate: today,
  endDate: today,
  flexibleTravel: false,
  sourceCountry: 'India',
  sourceState: '',
  source: '',
  sourceAddress: '',
  sourcePinCode: '',
  destinationCountry: 'India',
  destinationState: '',
  destination: '',
  destinationAddress: '',
  destinationPinCode: '',
  multiCity: false,
  extraCities: '',
  transportMode: 'Flight',
  preferredAirline: '',
  travelClass: 'Economy',
  ticketEstimate: 0,
  bookingRequired: true,
  hotelType: 'Business Standard',
  hotelCost: 0,
  roomPreference: 'Single',
  nightsCount: 1,
  breakfast: true,
  lunch: true,
  dinner: true,
  dailyMealLimit: 1200,
  advanceAmount: 0,
  advanceMode: 'bank_transfer',
  advanceJustification: '',
  assetRequests: []
};

const LOCATION_OPTIONS = {
  India: {
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Tirupati'],
    'Arunachal Pradesh': ['Itanagar', 'Tawang'],
    Assam: ['Guwahati', 'Dibrugarh', 'Silchar'],
    Bihar: ['Patna', 'Gaya', 'Muzaffarpur'],
    Chandigarh: ['Chandigarh'],
    Chhattisgarh: ['Raipur', 'Bhilai', 'Bilaspur'],
    Delhi: ['New Delhi', 'Delhi'],
    Goa: ['Panaji', 'Margao', 'Vasco da Gama'],
    Gujarat: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar', 'Jamnagar'],
    Haryana: ['Gurugram', 'Faridabad', 'Panipat', 'Ambala'],
    'Himachal Pradesh': ['Shimla', 'Manali', 'Dharamshala'],
    Jharkhand: ['Ranchi', 'Jamshedpur', 'Dhanbad'],
    Karnataka: ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi'],
    Kerala: ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur'],
    'Madhya Pradesh': ['Indore', 'Bhopal', 'Gwalior', 'Jabalpur'],
    Maharashtra: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Kolhapur'],
    Manipur: ['Imphal'],
    Meghalaya: ['Shillong'],
    Mizoram: ['Aizawl'],
    Nagaland: ['Kohima', 'Dimapur'],
    Odisha: ['Bhubaneswar', 'Cuttack', 'Puri', 'Rourkela'],
    Puducherry: ['Puducherry'],
    Punjab: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Mohali'],
    Rajasthan: ['Jaipur', 'Udaipur', 'Jodhpur', 'Kota', 'Ajmer'],
    Sikkim: ['Gangtok'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
    Telangana: ['Hyderabad', 'Warangal', 'Karimnagar'],
    Tripura: ['Agartala'],
    'Uttar Pradesh': ['Lucknow', 'Noida', 'Ghaziabad', 'Kanpur', 'Varanasi', 'Agra'],
    Uttarakhand: ['Dehradun', 'Haridwar', 'Rishikesh', 'Nainital'],
    'West Bengal': ['Kolkata', 'Howrah', 'Siliguri', 'Durgapur']
  },
  'United States': {
    California: ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento'],
    'New York': ['New York City', 'Buffalo', 'Rochester', 'Albany', 'Syracuse'],
    Texas: ['Houston', 'Austin', 'Dallas', 'San Antonio', 'Fort Worth'],
    Washington: ['Seattle', 'Spokane', 'Tacoma', 'Bellevue']
  },
  'United Kingdom': {
    England: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool', 'Bristol'],
    Scotland: ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee'],
    Wales: ['Cardiff', 'Swansea', 'Newport']
  },
  'United Arab Emirates': {
    Dubai: ['Dubai City', 'Jebel Ali'],
    'Abu Dhabi': ['Abu Dhabi City', 'Al Ain', 'Ruwais'],
    Sharjah: ['Sharjah City', 'Khor Fakkan']
  },
  Germany: {
    Bavaria: ['Munich', 'Nuremberg', 'Augsburg'],
    Berlin: ['Berlin City'],
    Hamburg: ['Hamburg City'],
    Frankfurt: ['Frankfurt City']
  },
  Singapore: {
    Central: ['Singapore City']
  },
  Australia: {
    'New South Wales': ['Sydney', 'Newcastle', 'Wollongong'],
    Victoria: ['Melbourne', 'Geelong', 'Ballarat'],
    Queensland: ['Brisbane', 'Gold Coast', 'Cairns']
  },
  Canada: {
    Ontario: ['Toronto', 'Ottawa', 'Mississauga', 'Hamilton'],
    Quebec: ['Montreal', 'Quebec City', 'Sherbrooke'],
    'British Columbia': ['Vancouver', 'Victoria', 'Surrey']
  }
};

const CITY_COORDINATES = {
  // India
  'Visakhapatnam': [17.6868, 83.2185],
  'Vijayawada': [16.5062, 80.6480],
  'Guntur': [16.3067, 80.4365],
  'Tirupati': [13.6288, 79.4192],
  'Itanagar': [27.0844, 93.6053],
  'Tawang': [27.5851, 91.8596],
  'Guwahati': [26.1445, 91.7362],
  'Dibrugarh': [27.4728, 94.9120],
  'Silchar': [24.8333, 92.7789],
  'Patna': [25.5941, 85.1376],
  'Gaya': [24.7955, 84.9994],
  'Muzaffarpur': [26.1209, 85.3647],
  'Chandigarh': [30.7333, 76.7794],
  'Raipur': [21.2514, 81.6296],
  'Bhilai': [21.1938, 81.3509],
  'Bilaspur': [22.0790, 82.1399],
  'New Delhi': [28.6139, 77.2090],
  'Delhi': [28.7041, 77.1025],
  'Panaji': [15.4909, 73.8278],
  'Margao': [15.2736, 73.9582],
  'Vasco da Gama': [15.3995, 73.8113],
  'Ahmedabad': [23.0225, 72.5714],
  'Surat': [21.1702, 72.8311],
  'Vadodara': [22.3072, 73.1812],
  'Rajkot': [22.3039, 70.8022],
  'Gandhinagar': [23.2156, 72.6369],
  'Bhavnagar': [21.7645, 72.1519],
  'Jamnagar': [22.4707, 70.0577],
  'Gurugram': [28.4595, 77.0266],
  'Faridabad': [28.4089, 77.3178],
  'Panipat': [29.3909, 76.9635],
  'Ambala': [30.3752, 76.7821],
  'Shimla': [31.1048, 77.1734],
  'Manali': [32.2396, 77.1887],
  'Dharamshala': [32.2190, 76.3234],
  'Ranchi': [23.3441, 85.3096],
  'Jamshedpur': [22.8046, 86.2029],
  'Dhanbad': [23.7957, 86.4304],
  'Bengaluru': [12.9716, 77.5946],
  'Mysuru': [12.2958, 76.6394],
  'Mangaluru': [12.9141, 74.8560],
  'Hubballi': [15.3647, 75.1240],
  'Belagavi': [15.8497, 74.4977],
  'Kochi': [9.9312, 76.2673],
  'Thiruvananthapuram': [8.5241, 76.9366],
  'Kozhikode': [11.2588, 75.7804],
  'Thrissur': [10.5276, 76.2144],
  'Indore': [22.7196, 75.8577],
  'Bhopal': [23.2599, 77.4126],
  'Gwalior': [26.2183, 78.1828],
  'Jabalpur': [23.1815, 79.9864],
  'Mumbai': [19.0760, 72.8777],
  'Pune': [18.5204, 73.8567],
  'Nagpur': [21.1458, 79.0882],
  'Nashik': [19.9975, 73.7898],
  'Thane': [19.2183, 72.9781],
  'Aurangabad': [19.8762, 75.3433],
  'Kolhapur': [16.7050, 74.2433],
  'Imphal': [24.8170, 93.9368],
  'Shillong': [25.5788, 91.8933],
  'Aizawl': [23.7271, 92.7176],
  'Kohima': [25.6751, 94.1086],
  'Dimapur': [25.9095, 93.7265],
  'Bhubaneswar': [20.2961, 85.8245],
  'Cuttack': [20.4625, 85.8830],
  'Puri': [19.8135, 85.8312],
  'Rourkela': [22.2604, 84.8536],
  'Puducherry': [11.9416, 79.8083],
  'Ludhiana': [30.9010, 75.8573],
  'Amritsar': [31.6340, 74.8723],
  'Jalandhar': [31.3260, 75.5762],
  'Mohali': [30.6970, 76.7195],
  'Jaipur': [26.9124, 75.7873],
  'Udaipur': [24.5854, 73.7125],
  'Jodhpur': [26.2389, 73.0243],
  'Kota': [25.2138, 75.8648],
  'Ajmer': [26.4499, 74.6399],
  'Gangtok': [27.3314, 88.6138],
  'Chennai': [13.0827, 80.2707],
  'Coimbatore': [11.0168, 76.9558],
  'Madurai': [9.9252, 78.1198],
  'Tiruchirappalli': [10.7905, 78.7047],
  'Salem': [11.6643, 78.1460],
  'Hyderabad': [17.3850, 78.4867],
  'Warangal': [17.9689, 79.5941],
  'Karimnagar': [18.4386, 79.1288],
  'Agartala': [23.8315, 91.2868],
  'Lucknow': [26.8467, 80.9462],
  'Noida': [28.5355, 77.3910],
  'Ghaziabad': [28.6692, 77.4538],
  'Kanpur': [26.4499, 80.3319],
  'Varanasi': [25.3176, 82.9739],
  'Agra': [27.1767, 78.0081],
  'Dehradun': [30.3165, 78.0322],
  'Haridwar': [29.9457, 78.1642],
  'Rishikesh': [30.0869, 78.2676],
  'Nainital': [29.3803, 79.4636],
  'Kolkata': [22.5726, 88.3639],
  'Howrah': [22.5785, 88.3178],
  'Siliguri': [26.7271, 88.3953],
  'Durgapur': [23.5204, 87.3119],

  // USA
  'Los Angeles': [34.0522, -118.2437],
  'San Francisco': [37.7749, -122.4194],
  'San Diego': [32.7157, -117.1611],
  'San Jose': [37.3382, -121.8863],
  'Sacramento': [38.5816, -121.4944],
  'New York City': [40.7128, -74.0060],
  'Buffalo': [42.8864, -78.8784],
  'Rochester': [43.1566, -77.6088],
  'Albany': [42.6526, -73.7562],
  'Syracuse': [43.0481, -76.1474],
  'Houston': [29.7604, -95.3698],
  'Austin': [30.2672, -97.7431],
  'Dallas': [32.7767, -96.7970],
  'San Antonio': [29.4241, -98.4936],
  'Fort Worth': [32.7555, -97.3308],
  'Seattle': [47.6062, -122.3321],
  'Spokane': [47.6588, -117.4260],
  'Tacoma': [47.2529, -122.4443],
  'Bellevue': [47.6101, -122.2015],

  // UK
  'London': [51.5074, -0.1278],
  'Manchester': [53.4808, -2.2426],
  'Birmingham': [52.4862, -1.8904],
  'Leeds': [53.8008, -1.5491],
  'Liverpool': [53.4084, -2.9916],
  'Bristol': [51.4545, -2.5879],
  'Edinburgh': [55.9533, -3.1883],
  'Glasgow': [55.8642, -4.2518],
  'Aberdeen': [57.1497, -2.0943],
  'Dundee': [56.4620, -2.9707],
  'Cardiff': [51.4816, -3.1791],
  'Swansea': [51.6214, -3.9436],
  'Newport': [51.5883, -2.9975],

  // UAE
  'Dubai City': [25.2048, 55.2708],
  'Jebel Ali': [25.0112, 55.0617],
  'Abu Dhabi City': [24.4539, 54.3773],
  'Al Ain': [24.1302, 55.8023],
  'Ruwais': [24.1102, 52.7306],
  'Sharjah City': [25.3463, 55.4209],
  'Khor Fakkan': [25.3374, 56.3414],

  // Germany
  'Munich': [48.1351, 11.5820],
  'Nuremberg': [49.4521, 11.0767],
  'Augsburg': [48.3717, 10.8983],
  'Berlin City': [52.5200, 13.4050],
  'Hamburg City': [53.5511, 9.9937],
  'Frankfurt City': [50.1109, 8.6821],

  // Singapore
  'Singapore City': [1.3521, 103.8198],

  // Australia
  'Sydney': [-33.8688, 151.2093],
  'Newcastle': [-32.9283, 151.7817],
  'Wollongong': [-34.4278, 150.8931],
  'Melbourne': [-37.8136, 144.9631],
  'Geelong': [-38.1499, 144.3617],
  'Ballarat': [-37.5622, 143.8503],
  'Brisbane': [-27.4705, 153.0260],
  'Gold Coast': [-28.0167, 153.4000],
  'Cairns': [-16.9186, 145.7781],

  // Canada
  'Toronto': [43.6532, -79.3832],
  'Ottawa': [45.4215, -75.6972],
  'Mississauga': [43.5890, -79.6441],
  'Hamilton': [43.2557, -79.8711],
  'Montreal': [45.5017, -73.5673],
  'Quebec City': [46.8139, -71.2082],
  'Sherbrooke': [45.4001, -71.8906],
  'Vancouver': [49.2827, -123.1207],
  'Victoria': [48.4284, -123.3656],
  'Surrey': [49.1913, -122.8490]
};

const MOCK_LANDMARKS = {
  // India
  'Ahmedabad': [
    { name: 'Titanium City Center, Anand Nagar Road', address: 'G-24, Titanium City Center, Anand Nagar Road, Prahlad Nagar', pinCode: '380015', x: 35, y: 45 },
    { name: 'GIFT One Tower, GIFT City', address: '12th Floor, GIFT One Tower, GIFT Road, Gandhinagar Highway', pinCode: '382355', x: 65, y: 20 },
    { name: 'IIM Ahmedabad, Vastrapur', address: 'Main Gate, IIM New Campus, Vastrapur Area', pinCode: '380015', x: 30, y: 55 },
    { name: 'Sardar Vallabhbhai Patel International Airport (AMD)', address: 'Terminal 2, Hansol Area, Airport Road', pinCode: '380003', x: 70, y: 35 },
    { name: 'Sabarmati Riverfront Development', address: 'Riverfront House, Behind Nirma University Office, Ashram Road', pinCode: '380009', x: 50, y: 50 }
  ],
  'Mumbai': [
    { name: 'Maker Chambers VI, Nariman Point', address: 'Suite 405, Maker Chambers VI, Jamnalal Bajaj Road, Nariman Point', pinCode: '400021', x: 20, y: 85 },
    { name: 'Naman Centre, Bandra Kurla Complex', address: '7th Floor, Naman Centre, G Block, Bandra Kurla Complex', pinCode: '400051', x: 45, y: 40 },
    { name: 'Taj Mahal Palace Hotel, Colaba', address: 'Apollo Bandar, Colaba, Near Gateway of India', pinCode: '400001', x: 25, y: 90 },
    { name: 'Chhatrapati Shivaji Maharaj Airport (BOM)', address: 'Terminal 2 Departure, Sahar Road, Andheri East', pinCode: '400099', x: 50, y: 30 },
    { name: 'Mindspace IT Park, Airoli', address: 'Building 4, Mindspace, Thane-Belapur Road, Airoli', pinCode: '400708', x: 75, y: 25 }
  ],
  'New Delhi': [
    { name: 'Rajiv Chowk, Connaught Place', address: 'Block C, Radial Road 3, Connaught Place', pinCode: '110001', x: 50, y: 50 },
    { name: 'DLF Cyber City, Gurugram', address: 'Building 10C, 14th Floor, DLF Cyber City, Gurugram Border', pinCode: '122002', x: 25, y: 75 },
    { name: 'Indira Gandhi International Airport (DEL)', address: 'Terminal 3, Aviation Road, New Delhi', pinCode: '110037', x: 20, y: 70 },
    { name: 'Lodi Colony Corporate Hub', address: 'Block 4, Lodhi Institutional Area, Lodhi Road', pinCode: '110003', x: 55, y: 65 },
    { name: 'Nehru Place IT Market', address: 'Eros Corporate Tower, Nehru Place Flyover', pinCode: '110019', x: 65, y: 75 }
  ],
  'Bengaluru': [
    { name: 'Manyata Tech Park, Hebbal', address: 'Block D3, Manyata Embassy Business Park, Outer Ring Road', pinCode: '560045', x: 45, y: 25 },
    { name: 'Prestige Shantiniketan, Whitefield', address: 'Tower C, Prestige Shantiniketan, ITPL Main Road, Whitefield', pinCode: '560048', x: 80, y: 60 },
    { name: 'UB City, Vittal Mallya Road', address: '24 Vittal Mallya Road, D Souza Layout, Ashok Nagar', pinCode: '560001', x: 40, y: 55 },
    { name: 'Kempegowda International Airport (BLR)', address: 'Devenahalli Area, Airport Exit Road', pinCode: '560300', x: 65, y: 15 },
    { name: 'Electronics City Phase 1', address: 'Wipro Campus Gate 4, Doddathogur Area', pinCode: '560100', x: 55, y: 85 }
  ],

  // USA
  'New York City': [
    { name: 'One World Trade Center', address: '285 Fulton St, One World Trade Center, Suite 85', pinCode: '10007', x: 30, y: 85 },
    { name: 'Empire State Building', address: '350 Fifth Ave, Empire State Building, Mid-town Manhattan', pinCode: '10118', x: 40, y: 60 },
    { name: 'John F. Kennedy International Airport (JFK)', address: 'JFK Access Road, Queens Area', pinCode: '11430', x: 85, y: 80 },
    { name: 'Times Square Commercial Hub', address: '1500 Broadway, Midtown Manhattan', pinCode: '10036', x: 38, y: 55 }
  ],
  'San Francisco': [
    { name: 'Salesforce Tower', address: '415 Mission St, Salesforce Tower, Financial District', pinCode: '94105', x: 60, y: 40 },
    { name: 'Golden Gate Park Business Center', address: '501 Stanyan St, Golden Gate Area', pinCode: '94117', x: 20, y: 50 },
    { name: 'San Francisco International Airport (SFO)', address: 'SFO Terminal 3 Road, San Mateo County', pinCode: '94128', x: 50, y: 85 },
    { name: 'Pier 39 Corporate Marina', address: 'Beach St & The Embarcadero', pinCode: '94133', x: 58, y: 15 }
  ],

  // UK
  'London': [
    { name: 'Canary Wharf Business Complex', address: '10 Upper Bank Street, Canary Wharf', pinCode: 'E14 5GH', x: 75, y: 55 },
    { name: 'The Shard, London Bridge', address: '32 London Bridge St, Southwark', pinCode: 'SE1 9SG', x: 55, y: 60 },
    { name: 'Heathrow Airport (LHR)', address: 'Heathrow Airport Terminal 5, Hounslow', pinCode: 'TW6 2GA', x: 15, y: 70 },
    { name: 'City of London Financial Hub', address: '30 St Mary Axe, Gherkin Building', pinCode: 'EC3A 8EP', x: 60, y: 45 }
  ],

  // UAE
  'Dubai City': [
    { name: 'Burj Khalifa, Downtown Dubai', address: '1 Sheikh Mohammed bin Rashid Blvd, Downtown Dubai', pinCode: '31213', x: 45, y: 55 },
    { name: 'Dubai Marina Corporate Office', address: 'Al Marsa Street, Dubai Marina', pinCode: '39954', x: 20, y: 75 },
    { name: 'Dubai International Airport (DXB)', address: 'Airport Road, Deira Area, Terminal 3', pinCode: '25204', x: 70, y: 30 },
    { name: 'Jumeirah Lakes Towers (JLT)', address: 'Saba Tower 1, Cluster E, Jumeirah Lakes Towers', pinCode: '34091', x: 25, y: 80 }
  ],

  // Singapore
  'Singapore City': [
    { name: 'Marina Bay Sands', address: '10 Bayfront Ave, Marina Bay', pinCode: '018956', x: 55, y: 65 },
    { name: 'Changi Airport Jewel', address: '78 Airport Blvd, Changi Airport', pinCode: '819666', x: 85, y: 40 },
    { name: 'Raffles Place Financial District', address: '1 Raffles Place, Downtown Core', pinCode: '048616', x: 45, y: 60 },
    { name: 'One North Tech Park', address: 'Galaxis Building, 1 Fusionopolis Place', pinCode: '138522', x: 25, y: 55 }
  ]
};

const getLandmarksForCity = (city, state, country) => {
  if (MOCK_LANDMARKS[city]) return MOCK_LANDMARKS[city];
  return [
    { name: `${city} City Center Landmark`, address: `10 High Street, Near Central Square, ${city}`, pinCode: country === 'India' ? '400001' : '90210', x: 35, y: 45 },
    { name: `${city} Technology Corporate Hub`, address: `Tower 2, Sector 5 Business Plaza, ${city}`, pinCode: country === 'India' ? '400002' : '90211', x: 65, y: 35 },
    { name: `${city} Regional Executive Suites`, address: `Plaza 4, East Bypass Road, ${city}`, pinCode: country === 'India' ? '400003' : '90212', x: 50, y: 65 }
  ];
};

const COUNTRY_COORDINATES = {
  'India': [20.5937, 78.9629],
  'United States': [37.0902, -95.7129],
  'United Kingdom': [55.3781, -3.4360],
  'United Arab Emirates': [23.4241, 53.8478],
  'Germany': [51.1657, 10.4515],
  'Singapore': [1.3521, 103.8198],
  'Australia': [-25.2744, 133.7751],
  'Canada': [56.1304, -106.3468],
  'France': [46.2276, 2.2137],
  'Japan': [36.2048, 138.2529],
  'China': [35.8617, 104.1954],
  'Brazil': [-14.2350, -51.9253],
  'South Africa': [-30.5595, 22.9375],
  'Russia': [61.5240, 105.3188]
};

const CITY_ALIASES = {
  'ahmadabad': 'ahmedabad',
  'bengaluru': 'bangalore',
  'bangalore': 'bengaluru',
  'gurugram': 'gurgaon',
  'gurgaon': 'gurugram',
  'mumbai': 'bombay',
  'bombay': 'mumbai',
  'kolkata': 'calcutta',
  'calcutta': 'kolkata',
  'chennai': 'madras',
  'madras': 'chennai',
  'pune': 'poona',
  'poona': 'pune'
};

const resolveCityName = (name) => {
  if (!name) return '';
  const clean = name.trim().toLowerCase();
  return CITY_ALIASES[clean] || clean;
};

const calculateDistance = (city1, city2, country1 = '', country2 = '') => {
  if (!city1 || !city2) return null;
  
  const normCity1 = resolveCityName(city1);
  const normCity2 = resolveCityName(city2);
  const normCountry1 = country1.trim().toLowerCase();
  const normCountry2 = country2.trim().toLowerCase();

  if (normCity1 === normCity2 && normCountry1 === normCountry2) {
    return 0;
  }

  const findCoordinates = (cityName) => {
    const cleanName = resolveCityName(cityName);
    const key = Object.keys(CITY_COORDINATES).find(
      k => resolveCityName(k) === cleanName
    );
    return key ? CITY_COORDINATES[key] : null;
  };

  let coord1 = findCoordinates(city1);
  let coord2 = findCoordinates(city2);
  
  if (!coord1 && country1 && COUNTRY_COORDINATES[country1]) {
    coord1 = COUNTRY_COORDINATES[country1];
  }
  if (!coord2 && country2 && COUNTRY_COORDINATES[country2]) {
    coord2 = COUNTRY_COORDINATES[country2];
  }

  if (!coord1 || !coord2) {
    const hash = (city1.length * 7 + city2.length * 13) % 450 + 150;
    return hash;
  }

  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  const rounded = Math.round(distance);
  
  if (rounded === 0) {
    if (normCity1 !== normCity2) {
      const hash = (city1.length * 7 + city2.length * 13) % 450 + 150;
      return hash;
    }
    return 0;
  }
  return rounded || 250;
};

const getTravelTimeEstimates = (distance, durationSeconds = null) => {
  if (distance === null || distance === undefined) return null;
  
  if (distance === 0) {
    return {
      flight: '0m',
      train: '0m',
      road: '0m'
    };
  }
  
  // Flight estimate: ~700 km/h cruising, plus 45m buffer/takeoff
  const flightHours = distance / 700 + 0.75;
  const flightMins = Math.round(flightHours * 60);
  const flightString = flightMins > 60 
    ? `${Math.floor(flightMins / 60)}h ${flightMins % 60}m`
    : `${flightMins}m`;

  // Train estimate: ~95 km/h avg speed (typical express/superfast speed in India)
  const trainHours = distance / 95;
  const trainMins = Math.round(trainHours * 60);
  const trainString = trainMins > 60
    ? `${Math.floor(trainMins / 60)}h ${trainMins % 60}m`
    : `${trainMins}m`;

  // Road estimate: Use live OSRM driving duration if available, else fallback
  let roadString = '';
  if (durationSeconds) {
    const hours = Math.floor(durationSeconds / 3600);
    const mins = Math.round((durationSeconds % 3600) / 60);
    roadString = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  } else {
    const roadHours = distance / 60;
    const roadMins = Math.round(roadHours * 60);
    roadString = roadMins > 60
      ? `${Math.floor(roadMins / 60)}h ${roadMins % 60}m`
      : `${roadMins}m`;
  }

  return {
    flight: flightString,
    train: trainString,
    road: roadString
  };
};

const countriesForTravelType = () => Object.keys(LOCATION_OPTIONS);
const statesForCountry = (country) => Object.keys(LOCATION_OPTIONS[country] || {});
const citiesForLocation = (country, state) => LOCATION_OPTIONS[country]?.[state] || [];
const formatLocation = (city, state, country, pinCode) => [city, state, country, pinCode].filter(Boolean).join(', ');
const buildAddressLine = ({ address, city, state, country, pinCode }) => [address, city, state, country, pinCode].filter(Boolean).join(', ');
const openMapSearch = (addressParts) => {
  const query = buildAddressLine(addressParts);
  if (!query) return;
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
};

const AddressMapSelector = ({ open, onClose, onConfirm, city, state, country }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pinPosition, setPinPosition] = useState({ x: 50, y: 50 });
  const [selectedLandmark, setSelectedLandmark] = useState(null);
  const [customAddress, setCustomAddress] = useState('');
  const [customPinCode, setCustomPinCode] = useState('');

  const landmarks = useMemo(() => getLandmarksForCity(city, state, country), [city, state, country]);

  const filteredLandmarks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    const filtered = landmarks.filter(l => 
      l.name.toLowerCase().includes(query) || 
      l.address.toLowerCase().includes(query)
    );
    
    if (filtered.length === 0 && searchQuery.trim().length > 0) {
      const q = searchQuery.trim();
      const sector = (q.length % 7) + 1;
      
      let genPinCode = country === 'India' ? '395000' : '90210';
      if (country === 'India') {
        const base = city.toLowerCase() === 'ahmedabad' ? 380000 : city.toLowerCase() === 'mumbai' ? 400000 : 395000;
        genPinCode = String(base + (q.length * 3) % 99);
      }
      
      filtered.push({
        name: q,
        address: `${q}, Sector ${sector}, ${city}, ${state}`,
        pinCode: genPinCode,
        x: (q.length * 13) % 50 + 25,
        y: (q.length * 17) % 50 + 25,
        isCustom: true
      });
    }
    return filtered;
  }, [landmarks, searchQuery, city, state, country]);

  useEffect(() => {
    if (landmarks && landmarks.length > 0) {
      const first = landmarks[0];
      setPinPosition({ x: first.x, y: first.y });
      setSelectedLandmark(first);
      setCustomAddress(first.address);
      setCustomPinCode(first.pinCode);
      setSearchQuery('');
    } else {
      setPinPosition({ x: 50, y: 50 });
      setSelectedLandmark(null);
      setCustomAddress(`Corporate Park, Sector 4, ${city}`);
      setCustomPinCode(country === 'India' ? '380001' : '90210');
      setSearchQuery('');
    }
  }, [landmarks, city, country, state]);

  const handleLandmarkSelect = (landmark) => {
    setPinPosition({ x: landmark.x, y: landmark.y });
    setSelectedLandmark(landmark);
    setCustomAddress(landmark.address);
    setCustomPinCode(landmark.pinCode);
    setSearchQuery(landmark.name);
  };

  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setPinPosition({ x, y });
    
    const nearby = landmarks.find(l => Math.abs(l.x - x) < 8 && Math.abs(l.y - y) < 8);
    if (nearby) {
      setSelectedLandmark(nearby);
      setCustomAddress(nearby.address);
      setCustomPinCode(nearby.pinCode);
      setSearchQuery(nearby.name);
    } else {
      setSelectedLandmark(null);
      const streetNum = Math.floor(x * 1.5 + y * 2.3) + 12;
      const sector = Math.floor(x / 15) + 1;
      const genAddress = `${streetNum} Business Boulevard, Sector ${sector}, ${city}, ${state}`;
      const genPinCode = country === 'India' 
        ? `${380000 + Math.floor(x * 2 + y)}`
        : `${90200 + Math.floor(x + y)}`;
      setCustomAddress(genAddress);
      setCustomPinCode(genPinCode);
      setSearchQuery(`Custom Pin (Dropped near Sector ${sector})`);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          className="absolute inset-0 bg-slate-950/45 backdrop-blur-md" 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        
        <motion.div 
          className="relative flex flex-col w-full max-w-3xl h-[620px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:bg-slate-900 dark:border-slate-800"
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25 }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Compass className="h-5 w-5 text-blue-600 animate-spin-slow" />
                Address Selector Map ({city}, {country})
              </h3>
              <p className="text-xs text-slate-500">Search landmarks or click anywhere on the virtual grid to pinpoint the exact office/hotel location.</p>
            </div>
            <button className="btn-secondary px-2 py-2" onClick={onClose}><X className="h-4.5 w-4.5" /></button>
          </div>

          <div className="flex-1 grid md:grid-cols-[280px_1fr] overflow-hidden">
            <div className="flex flex-col border-r border-slate-100 p-4 dark:border-slate-800 overflow-y-auto">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input 
                  className="input pl-9 pr-3 py-2 text-xs" 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  placeholder="Search landmarks..." 
                />
              </div>

              <div className="flex-1 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{searchQuery.trim() ? 'Search Results' : 'Popular Locations'}</p>
                {filteredLandmarks.map((landmark) => (
                  <button 
                    key={landmark.name}
                    className={`w-full text-left p-3 rounded-xl transition border text-xs ${selectedLandmark?.name === landmark.name ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-200' : 'bg-slate-50/60 border-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/80'}`}
                    onClick={() => handleLandmarkSelect(landmark)}
                  >
                    <div className="font-bold flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" /> {landmark.name}</div>
                    <div className="mt-1 text-[10px] text-slate-500 leading-relaxed truncate">{landmark.address}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative p-6 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col justify-between overflow-hidden">
              <div 
                className="relative flex-1 w-full border border-slate-200/80 rounded-2xl bg-white shadow-inner overflow-hidden cursor-crosshair dark:bg-slate-900 dark:border-slate-800"
                onClick={handleMapClick}
              >
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] opacity-50" />
                
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20 dark:opacity-10">
                  <path d="M-50,150 Q100,100 250,220 T550,180 T800,280" fill="none" stroke="#2563eb" strokeWidth="32" strokeLinecap="round" />
                </svg>

                <div className="absolute top-8 left-16 w-32 h-20 bg-emerald-100/60 rounded-full blur-sm dark:bg-emerald-950/20 pointer-events-none" />
                
                {filteredLandmarks.map((landmark) => (
                  <div 
                    key={landmark.name}
                    className="absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform group"
                    style={{ left: `${landmark.x}%`, top: `${landmark.y}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLandmarkSelect(landmark);
                    }}
                  >
                    <div className="relative flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 shadow-md dark:bg-blue-950 border-2 border-blue-500">
                      <MapPin className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="absolute bottom-9 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-30">
                      {landmark.name}
                    </div>
                  </div>
                ))}

                <motion.div 
                  className="absolute z-20 -translate-x-1/2 -translate-y-full pointer-events-none"
                  style={{ left: `${pinPosition.x}%`, top: `${pinPosition.y}%` }}
                  animate={{ left: `${pinPosition.x}%`, top: `${pinPosition.y}%` }}
                  transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                >
                  <span className="absolute -left-3 -top-3 flex h-14 w-14">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60"></span>
                    <span className="relative inline-flex rounded-full h-8 w-8 bg-rose-500 opacity-20"></span>
                  </span>
                  <div className="relative flex flex-col items-center">
                    <div className="bg-rose-600 text-white rounded-xl shadow-lg border border-rose-500 p-2 text-[10px] font-bold whitespace-nowrap mb-1 -translate-y-2">
                      Selected Location
                    </div>
                    <MapPin className="h-9 w-9 text-rose-600 drop-shadow-md -translate-y-2 fill-rose-600" />
                  </div>
                </motion.div>
              </div>

              <div className="mt-4 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PINPOINT ADDRESS DETAILS</p>
                      <h4 className="mt-1 font-bold text-xs text-slate-800 dark:text-white leading-relaxed truncate">{customAddress}</h4>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-500">PIN / Postal Code: <span className="text-slate-800 dark:text-white">{customPinCode}</span></p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase py-1 px-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-500 dark:bg-slate-800/40 dark:border-slate-800">
                      <Globe className="h-3 w-3 text-slate-400" /> X:{pinPosition.x} Y:{pinPosition.y}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      className="btn-primary w-full text-xs font-semibold py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center justify-center gap-1.5"
                      onClick={() => onConfirm({ address: customAddress, pinCode: customPinCode })}
                    >
                      <CheckCircle2 className="h-4.5 w-4.5" /> Confirm and Auto-Fill Address
                    </button>
                    <button 
                      type="button" 
                      className="btn-secondary text-xs py-2 px-3 border border-slate-200 hover:bg-slate-50 rounded-xl"
                      onClick={onClose}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};const InlineLocalMapPicker = ({ city, state, country, currentAddress, onSelectArea, colorTheme = 'blue' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef(null);

  const landmarks = useMemo(() => {
    if (!city) return [];
    return getLandmarksForCity(city, state, country);
  }, [city, state, country]);

  const filteredLandmarks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return landmarks;

    const filtered = landmarks.filter(l => 
      l.name.toLowerCase().includes(query) || 
      l.address.toLowerCase().includes(query)
    );

    // If no exact match, allow adding custom entered address
    const hasExactMatch = landmarks.some(l => l.name.toLowerCase() === query);
    if (!hasExactMatch && query.length > 0) {
      const q = searchQuery.trim();
      const sector = (q.length % 7) + 1;
      let genPinCode = country === 'India' ? '380001' : '90210';
      if (country === 'India') {
        const base = city.toLowerCase() === 'ahmedabad' ? 380000 : city.toLowerCase() === 'mumbai' ? 400000 : 395000;
        genPinCode = String(base + (q.length * 3) % 99);
      }
      filtered.push({
        name: q,
        address: `${q}, Sector ${sector}, ${city}, ${state}`,
        pinCode: genPinCode,
        x: (q.length * 13) % 50 + 25,
        y: (q.length * 17) % 50 + 25,
        isCustom: true
      });
    }
    return filtered;
  }, [landmarks, searchQuery, city, state, country]);

  // Find if currentAddress matches any landmark to highlight it
  const selectedIndex = useMemo(() => {
    if (!currentAddress) return -1;
    return filteredLandmarks.findIndex(l => 
      currentAddress.toLowerCase().includes(l.name.toLowerCase()) || 
      l.address.toLowerCase().includes(currentAddress.toLowerCase()) || 
      currentAddress.toLowerCase().includes(l.address.toLowerCase())
    );
  }, [currentAddress, filteredLandmarks]);

  // Synchronize searchQuery with active selection if set
  useEffect(() => {
    if (currentAddress) {
      const match = filteredLandmarks.find(l => 
        currentAddress.toLowerCase().includes(l.name.toLowerCase()) || 
        l.address.toLowerCase().includes(currentAddress.toLowerCase()) || 
        currentAddress.toLowerCase().includes(l.address.toLowerCase())
      );
      if (match) {
        setSearchQuery(match.name);
      }
    } else {
      setSearchQuery('');
    }
  }, [currentAddress]);

  // Handle clicking outside to close suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!city) {
    return (
      <div className="rounded-2xl border border-slate-200/60 p-4 text-center bg-slate-50/50 dark:bg-slate-900/30 dark:border-slate-800">
        <p className="text-xs text-slate-400 font-semibold flex items-center justify-center gap-1.5">
          <Compass className="h-4 w-4 text-slate-350 animate-spin-slow" />
          Select a city to display interactive local area map
        </p>
      </div>
    );
  }

  const isBlue = colorTheme === 'blue';
  const accentColor = isBlue ? 'blue' : 'rose';
  const accentHex = isBlue ? '#3b82f6' : '#f43f5e';
  const bgBadge = isBlue ? 'bg-blue-50/70 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300' : 'bg-rose-50/70 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300';
  const borderActive = isBlue ? 'border-blue-400 dark:border-blue-700' : 'border-rose-400 dark:border-rose-700';
  const bgActive = isBlue ? 'bg-blue-50/60 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-200' : 'bg-rose-50/60 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-200';
  const textTitle = isBlue ? 'text-blue-650 dark:text-blue-400' : 'text-rose-650 dark:text-rose-400';

  const handleSelectArea = (landmark) => {
    onSelectArea(landmark);
    setSearchQuery(landmark.name);
    setShowSuggestions(false);
  };

  return (
    <div className="rounded-2xl border border-slate-200 p-3.5 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col gap-3 transition-all duration-350">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Compass className={`h-4 w-4 ${textTitle} animate-spin-slow`} />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Local Area Map & Landmarks ({city})
          </span>
        </div>
        <span className={`text-[9px] font-extrabold py-0.5 px-2 rounded-md uppercase tracking-wider ${bgBadge}`}>
          Tactile Picker
        </span>
      </div>

      {/* Dynamic Search Box */}
      <div className="relative" ref={containerRef}>
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input 
          className="input pl-9 pr-8 py-1.5 text-xs rounded-xl" 
          value={searchQuery} 
          onFocus={() => setShowSuggestions(true)}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowSuggestions(true);
          }} 
          placeholder="Search address or type custom area name..." 
        />
        {searchQuery && (
          <button 
            type="button" 
            className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350"
            onClick={() => {
              setSearchQuery('');
              setShowSuggestions(false);
              onSelectArea({ address: '', pinCode: '', name: '' });
            }}
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Autocomplete Dropdown Suggestions Panel */}
        {showSuggestions && searchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-[60] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-[180px] overflow-y-auto dark:bg-slate-900 dark:border-slate-800 transition-all">
            {filteredLandmarks.map((landmark) => (
              <button
                key={landmark.name}
                type="button"
                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all border-b border-slate-50 dark:border-slate-800/40 last:border-b-0 text-xs flex items-center justify-between gap-2"
                onClick={() => handleSelectArea(landmark)}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 leading-snug">
                    <MapPin className={`h-3.5 w-3.5 shrink-0 ${isBlue ? 'text-blue-500' : 'text-rose-500'}`} />
                    {landmark.name}
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500 truncate leading-normal">
                    {landmark.address}
                  </div>
                </div>
                {landmark.isCustom ? (
                  <span className={`text-[8px] font-extrabold uppercase py-0.5 px-1.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-150 shrink-0 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40`}>
                    Use Typed Custom
                  </span>
                ) : (
                  <span className="text-[8px] font-semibold text-slate-400 shrink-0">
                    City Center
                  </span>
                )}
              </button>
            ))}
            {filteredLandmarks.length === 0 && (
              <div className="p-3 text-center text-[11px] text-slate-400">
                No matching areas. Type a name to add custom address.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Visual Map Grid */}
      <div className="relative h-[130px] rounded-xl border border-slate-200/80 bg-slate-50/60 overflow-hidden cursor-pointer dark:border-slate-800 dark:bg-slate-950/20 shadow-inner">
        {/* Grid lines overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:20px_20px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] opacity-40 pointer-events-none" />
        
        {/* Vector road illustration */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
          <path d="M-10,40 Q120,80 200,30 T400,60" fill="none" stroke={accentHex} strokeWidth="6" strokeLinecap="round" />
          <path d="M50,-10 Q80,70 120,150" fill="none" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
        </svg>

        {/* Landmarks Pins */}
        {filteredLandmarks.map((landmark, idx) => {
          const isActive = selectedIndex === idx;
          return (
            <div 
              key={landmark.name}
              className="absolute -translate-x-1/2 -translate-y-1/2 group transition-all"
              style={{ left: `${landmark.x}%`, top: `${landmark.y}%` }}
              onClick={() => handleSelectArea(landmark)}
            >
              <div className="relative flex items-center justify-center">
                {isActive && (
                  <span className="absolute flex h-9 w-9 -top-1 -left-1">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${isBlue ? 'bg-blue-400' : 'bg-rose-400'}`}></span>
                    <span className={`relative inline-flex rounded-full h-5 w-5 opacity-20 ${isBlue ? 'bg-blue-500' : 'bg-rose-500'}`}></span>
                  </span>
                )}
                
                <div className={`flex h-7 w-7 items-center justify-center rounded-full shadow-md border transition-all duration-200 hover:scale-110 ${isActive ? (isBlue ? 'bg-blue-600 border-blue-500 text-white' : 'bg-rose-600 border-rose-500 text-white') : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-750'}`}>
                  <MapPin className="h-3.5 w-3.5 fill-current" />
                </div>
              </div>
              <div className="absolute bottom-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[9px] py-0.5 px-1.5 rounded shadow-lg whitespace-nowrap z-10 font-bold dark:bg-slate-800 border border-slate-700">
                {landmark.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Neighborhood Pills/Lists */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {searchQuery.trim() ? 'Matching Neighborhoods / Custom Area:' : 'Quick Pick Neighborhood / Center Area:'}
        </p>
        <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pr-1">
          {filteredLandmarks.map((landmark, idx) => {
            const isActive = selectedIndex === idx;
            return (
              <button
                key={landmark.name}
                type="button"
                onClick={() => handleSelectArea(landmark)}
                className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all text-left flex items-center gap-1 ${isActive ? bgActive + ' ' + borderActive : 'bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-slate-100 hover:text-slate-855 dark:bg-slate-800/40 dark:border-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white'}`}
              >
                <MapPin className={`h-3 w-3 shrink-0 ${isActive ? (isBlue ? 'text-blue-500' : 'text-rose-500') : 'text-slate-400'}`} />
                {landmark.name.split(',')[0]}
                {landmark.isCustom && <span className="text-[8px] opacity-75 font-normal ml-0.5">(Custom Search)</span>}
              </button>
            );
          })}
          {filteredLandmarks.length === 0 && (
            <p className="text-[10px] text-slate-400">No areas found. Type above to add a custom address.</p>
          )}
        </div>
      </div>
    </div>
  );
};


const TravelRouteVisualizer = ({ sourceCity, sourceState, sourceCountry, destCity, destState, destCountry, transportMode }) => {
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);

  useEffect(() => {
    if (!sourceCity || !destCity) {
      setDistance(null);
      setDuration(null);
      return;
    }

    // Set initial fallback estimate synchronously
    const fallback = calculateDistance(sourceCity, destCity, sourceCountry, destCountry);
    setDistance(fallback);
    setDuration(null);

    // Call Nominatim API + OSRM Routing API for real-time accurate road distance
    const fetchRealCoordinatesAndRoute = async () => {
      try {
        const query1 = [sourceCity, sourceState, sourceCountry].filter(Boolean).join(', ');
        const query2 = [destCity, destState, destCountry].filter(Boolean).join(', ');

        const [res1, res2] = await Promise.all([
          fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query1)}&format=json&limit=1`, {
            headers: { 'User-Agent': 'GT-Expense-Management-App' }
          }).then(r => r.json()),
          fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query2)}&format=json&limit=1`, {
            headers: { 'User-Agent': 'GT-Expense-Management-App' }
          }).then(r => r.json())
        ]);

        if (res1?.length > 0 && res2?.length > 0) {
          const lat1 = parseFloat(res1[0].lat);
          const lon1 = parseFloat(res1[0].lon);
          const lat2 = parseFloat(res2[0].lat);
          const lon2 = parseFloat(res2[0].lon);

          const normCity1 = resolveCityName(sourceCity);
          const normCity2 = resolveCityName(destCity);
          const normCountry1 = sourceCountry.trim().toLowerCase();
          const normCountry2 = destCountry.trim().toLowerCase();

          if (normCity1 === normCity2 && normCountry1 === normCountry2) {
            setDistance(0);
            setDuration(0);
            return;
          }

          // Try fetching actual road driving distance from OSRM first
          try {
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
            const osrmRes = await fetch(osrmUrl).then(r => r.json());
            
            if (osrmRes && osrmRes.routes && osrmRes.routes.length > 0) {
              const roadDistanceKm = Math.round(osrmRes.routes[0].distance / 1000);
              const roadDurationSeconds = osrmRes.routes[0].duration;
              if (roadDistanceKm > 0) {
                setDistance(roadDistanceKm);
                setDuration(roadDurationSeconds);
                return;
              }
            }
          } catch (osrmErr) {
            console.warn("OSRM road routing failed, falling back to haversine:", osrmErr);
          }

          // Fallback to haversine straight-line distance
          const R = 6371; // Earth radius in km
          const dLat = ((lat2 - lat1) * Math.PI) / 180;
          const dLon = ((lon2 - lon1) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
              Math.cos((lat2 * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distanceVal = R * c;

          setDistance(Math.max(1, Math.round(distanceVal)));
          setDuration(null);
        }
      } catch (err) {
        console.warn("Failed to fetch dynamic coordinates, using local fallback:", err);
      }
    };

    fetchRealCoordinatesAndRoute();
  }, [sourceCity, sourceState, sourceCountry, destCity, destState, destCountry]);

  const estimates = useMemo(() => getTravelTimeEstimates(distance, duration), [distance, duration]);

  if (!sourceCity || !destCity) return null;

  const isSame = sourceCity === destCity;

  return (
    <div className="md:col-span-2 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950 p-5 text-white shadow-lg dark:border-slate-800 relative">
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-[size:16px_16px]" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left min-w-[140px] space-y-1">
          <span className="inline-block py-0.5 px-2 rounded-lg text-[9px] font-bold uppercase bg-blue-500/25 border border-blue-500/30 text-blue-300">
            Origin Location
          </span>
          <h4 className="text-lg font-bold text-white tracking-wide truncate">{sourceCity}</h4>
          <p className="text-[11px] font-semibold text-slate-400">{sourceState}, {sourceCountry}</p>
        </div>

        <div className="flex-1 w-full h-[100px] flex items-center justify-center relative">
          <svg className="w-full h-full" viewBox="0 0 300 100" fill="none">
            {isSame ? (
              <path 
                d="M 150,50 C 120,10 180,10 150,50" 
                stroke="url(#routeGradient)" 
                strokeWidth="3" 
                strokeDasharray="5,5" 
                className="animate-dash" 
              />
            ) : (
              <path 
                d="M 40,50 Q 150,15 260,50" 
                stroke="url(#routeGradient)" 
                strokeWidth="2" 
                strokeDasharray="6,4" 
                className="animate-dash" 
              />
            )}

            <circle cx="40" cy="50" r="5" fill="#3b82f6" />
            <circle cx="40" cy="50" r="10" fill="#3b82f6" className="animate-ping" style={{ transformOrigin: '40px 50px' }} opacity="0.4" />

            <circle cx="260" cy="50" r="5" fill="#f43f5e" />
            <circle cx="260" cy="50" r="10" fill="#f43f5e" className="animate-ping" style={{ transformOrigin: '260px 50px' }} opacity="0.4" />

            {!isSame && (
              <g className="animate-travel-along">
                <circle cx="0" cy="0" r="6" fill="#60a5fa" className="shadow-lg shadow-blue-500/50" />
                <foreignObject x="-7" y="-7" width="14" height="14">
                  {transportMode === 'Flight' ? (
                    <Plane className="h-3.5 w-3.5 text-blue-950 font-bold rotate-90" />
                  ) : transportMode === 'Train' ? (
                    <Train className="h-3.5 w-3.5 text-blue-950 font-bold" />
                  ) : (
                    <Route className="h-3.5 w-3.5 text-blue-950 font-bold" />
                  )}
                </foreignObject>
              </g>
            )}

            <defs>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
            </defs>
          </svg>

          {distance !== null && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="py-1 px-3 rounded-full bg-slate-900/90 border border-slate-700/80 text-[10px] font-extrabold uppercase tracking-widest text-slate-200 shadow-md">
                {distance.toLocaleString()} km
              </span>
            </div>
          )}
        </div>

        <div className="text-center md:text-right min-w-[140px] space-y-1">
          <span className="inline-block py-0.5 px-2 rounded-lg text-[9px] font-bold uppercase bg-rose-500/25 border border-rose-500/30 text-rose-300">
            Destination Location
          </span>
          <h4 className="text-lg font-bold text-white tracking-wide truncate">{destCity}</h4>
          <p className="text-[11px] font-semibold text-slate-400">{destState}, {destCountry}</p>
        </div>
      </div>

      {distance !== null && estimates && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center relative z-10">
          <div className="p-2 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/50 transition">
            <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-slate-400"><Plane className="h-3.5 w-3.5 text-blue-400" /> Flight Est.</span>
            <span className="mt-1 block text-xs font-bold text-white">{estimates.flight}</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/50 transition">
            <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-slate-400"><Train className="h-3.5 w-3.5 text-amber-400" /> Train Est.</span>
            <span className="mt-1 block text-xs font-bold text-white">{estimates.train}</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700/50 transition">
            <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-slate-400"><Route className="h-3.5 w-3.5 text-rose-400" /> Driving Est.</span>
            <span className="mt-1 block text-xs font-bold text-white">{estimates.road}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -20;
          }
        }
        .animate-dash {
          animation: dash 4s linear infinite;
        }
        @keyframes travelAlong {
          0% {
            offset-distance: 0%;
          }
          100% {
            offset-distance: 100%;
          }
        }
        .animate-travel-along {
          offset-path: path('M 40,50 Q 150,15 260,50');
          animation: travelAlong 5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
      `}</style>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, tone = 'blue' }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
        <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{value}</p>
      </div>
      <div className={`rounded-xl p-2 ${tone === 'green' ? 'bg-emerald-50 text-emerald-600' : tone === 'amber' ? 'bg-amber-50 text-amber-600' : tone === 'rose' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </div>
);

const SectionTitle = ({ icon: Icon, title, description }) => (
  <div className="md:col-span-2">
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-blue-600" />
      <h3 className="text-sm font-bold uppercase text-slate-800 dark:text-white">{title}</h3>
    </div>
    {description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
  </div>
);

const Field = ({ label, children, required = false }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}{required && <span className="text-rose-600"> *</span>}</span>
    {children}
  </label>
);



const DetailTile = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
    <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
    <p className="mt-1 font-bold text-slate-900 dark:text-white">{value || '-'}</p>
  </div>
);

const calcDays = (start, end) => {
  if (!start || !end) return 1;
  const diff = Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1;
  return Math.max(1, diff || 1);
};

const buildPurpose = (form) => [
  form.purpose,
  form.businessJustification && `Business Justification: ${form.businessJustification}`,
  form.clientName && `Client: ${form.clientName}`,
  form.projectCode && `Project: ${form.projectCode}`,
  form.costCenter && `Cost Center: ${form.costCenter}`,
  form.advanceAmount > 0 && `Advance Requested: ${money(form.advanceAmount)} via ${form.advanceMode}`,
  form.advanceJustification && `Advance Justification: ${form.advanceJustification}`
].filter(Boolean).join('\n');

const TravelWizard = ({ open, onClose, onSubmit, isSaving, user }) => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const toast = useToast();
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [mapTargetField, setMapTargetField] = useState('source');

  const { data: departmentData } = useQuery({
    queryKey: ['enterprise', 'departments'],
    queryFn: () => api.enterpriseList('departments', { limit: 200 }),
    enabled: open
  });
  const departmentsList = departmentData?.items || [];

  const handleMapConfirm = ({ address, pinCode }) => {
    if (mapTargetField === 'source') {
      setForm(prev => ({
        ...prev,
        sourceAddress: address,
        sourcePinCode: pinCode
      }));
    } else {
      setForm(prev => ({
        ...prev,
        destinationAddress: address,
        destinationPinCode: pinCode
      }));
    }
    setShowMapSelector(false);
  };

  const [countriesList, setCountriesList] = useState(['India', 'United States', 'United Kingdom', 'United Arab Emirates', 'Germany', 'Singapore', 'Australia', 'Canada']);
  const [sourceStatesList, setSourceStatesList] = useState([]);
  const [destStatesList, setDestStatesList] = useState([]);
  const [sourceCitiesList, setSourceCitiesList] = useState([]);
  const [destCitiesList, setDestCitiesList] = useState([]);

  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingSourceStates, setLoadingSourceStates] = useState(false);
  const [loadingDestStates, setLoadingDestStates] = useState(false);
  const [loadingSourceCities, setLoadingSourceCities] = useState(false);
  const [loadingDestCities, setLoadingDestCities] = useState(false);

  useEffect(() => {
    const fetchCountries = async () => {
      setLoadingCountries(true);
      try {
        const res = await fetch('https://countriesnow.space/api/v0.1/countries/iso');
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          const list = json.data.map(c => c.name).sort();
          const sortedList = ['India', ...list.filter(c => c !== 'India')];
          setCountriesList(sortedList);
        }
      } catch (err) {
        console.warn("Failed to fetch country list, using standard offline list.", err);
      } finally {
        setLoadingCountries(false);
      }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    if (!form.sourceCountry) {
      setSourceStatesList([]);
      return;
    }
    const fetchStates = async () => {
      setLoadingSourceStates(true);
      try {
        const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: form.sourceCountry })
        });
        const json = await res.json();
        if (json.data && json.data.states) {
          const list = json.data.states.map(s => s.name).sort();
          setSourceStatesList(list);
        } else {
          setSourceStatesList([]);
        }
      } catch (err) {
        console.warn("Failed to fetch states.", err);
        setSourceStatesList(Object.keys(LOCATION_OPTIONS[form.sourceCountry] || {}));
      } finally {
        setLoadingSourceStates(false);
      }
    };
    fetchStates();
  }, [form.sourceCountry]);

  useEffect(() => {
    if (!form.destinationCountry) {
      setDestStatesList([]);
      return;
    }
    const fetchStates = async () => {
      setLoadingDestStates(true);
      try {
        const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: form.destinationCountry })
        });
        const json = await res.json();
        if (json.data && json.data.states) {
          const list = json.data.states.map(s => s.name).sort();
          setDestStatesList(list);
        } else {
          setDestStatesList([]);
        }
      } catch (err) {
        console.warn("Failed to fetch states.", err);
        setDestStatesList(Object.keys(LOCATION_OPTIONS[form.destinationCountry] || {}));
      } finally {
        setLoadingDestStates(false);
      }
    };
    fetchStates();
  }, [form.destinationCountry]);

  useEffect(() => {
    if (!form.sourceCountry || !form.sourceState) {
      setSourceCitiesList([]);
      return;
    }
    const fetchCities = async () => {
      setLoadingSourceCities(true);
      try {
        const res = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: form.sourceCountry, state: form.sourceState })
        });
        const json = await res.json();
        if (json.data) {
          const list = json.data.sort();
          setSourceCitiesList(list);
        } else {
          setSourceCitiesList([]);
        }
      } catch (err) {
        console.warn("Failed to fetch cities.", err);
        setSourceCitiesList(LOCATION_OPTIONS[form.sourceCountry]?.[form.sourceState] || []);
      } finally {
        setLoadingSourceCities(false);
      }
    };
    fetchCities();
  }, [form.sourceCountry, form.sourceState]);

  useEffect(() => {
    if (!form.destinationCountry || !form.destinationState) {
      setDestCitiesList([]);
      return;
    }
    const fetchCities = async () => {
      setLoadingDestCities(true);
      try {
        const res = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: form.destinationCountry, state: form.destinationState })
        });
        const json = await res.json();
        if (json.data) {
          const list = json.data.sort();
          setDestCitiesList(list);
        } else {
          setDestCitiesList([]);
        }
      } catch (err) {
        console.warn("Failed to fetch cities.", err);
        setDestCitiesList(LOCATION_OPTIONS[form.destinationCountry]?.[form.destinationState] || []);
      } finally {
        setLoadingDestCities(false);
      }
    };
    fetchCities();
  }, [form.destinationCountry, form.destinationState]);
  const estimatePayload = useMemo(() => ({
    source: form.source,
    destination: form.destination,
    travelType: form.travelType,
    startDate: form.startDate,
    endDate: form.endDate,
    transportMode: form.transportMode,
    travelClass: form.travelClass,
    ticketEstimate: form.ticketEstimate,
    hotelCost: form.hotelCost,
    dailyMealLimit: form.dailyMealLimit,
    advanceAmount: form.advanceAmount
  }), [form.advanceAmount, form.dailyMealLimit, form.destination, form.endDate, form.hotelCost, form.source, form.startDate, form.ticketEstimate, form.transportMode, form.travelClass, form.travelType]);
  const { data: estimate } = useQuery({
    queryKey: ['travel-estimate', estimatePayload],
    queryFn: () => api.estimateTravelRequest(estimatePayload),
    enabled: open && Boolean(form.source || form.destination),
    retry: false
  });
  const { data: travelAssetData = { assets: [] }, isLoading: travelAssetsLoading } = useQuery({
    queryKey: ['travel-assets-for-request', open],
    queryFn: () => api.travelAssets(),
    enabled: open,
    retry: false
  });
  const availableTravelAssets = travelAssetData.assets || [];

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setFormError('');
    setForm({
      ...initialForm,
      employeeName: user?.name || '',
      department: user?.department || '',
      costCenter: user?.department ? `${String(user.department).slice(0, 3).toUpperCase()}-TRAVEL` : ''
    });
  }, [open, user?.department, user?.name]);

  const days = calcDays(form.startDate, form.endDate);
  const nights = estimate?.nights ?? Math.max(Number(form.nightsCount || 0), Math.max(0, days - 1));
  const ticketEstimate = estimate?.ticketEstimate ?? Number(form.ticketEstimate || 0);
  const hotelCost = estimate?.hotelCost ?? Number(form.hotelCost || 0);
  const perDiem = estimate?.mealAllowance ?? Number(form.dailyMealLimit || 0) * days;
  const stayAllowance = estimate?.stayAllowance ?? hotelCost * nights;
  const localTransport = estimate?.localTransport ?? 0;
  const estimatedTotal = estimate?.estimatedTotal ?? (ticketEstimate + stayAllowance + perDiem + localTransport);
  const departmentBudget = estimate?.departmentBudgetRemaining ?? Math.max(0, 250000 - estimatedTotal);
  const policyAllowedBudget = estimate?.policyAllowedBudget ?? (form.travelType === 'international' ? 350000 : 150000);
  const advanceEligible = estimate?.advanceEligible ?? Math.round(Math.min(estimatedTotal * 0.6, 75000));
  const sourceCountries = countriesList;
  const destinationCountries = countriesList;
  const sourceStates = sourceStatesList;
  const destinationStates = destStatesList;
  const sourceCities = sourceCitiesList;
  const destinationCities = destCitiesList;

  const policyAlerts = useMemo(() => {
    if (estimate?.policyAlerts) return estimate.policyAlerts;
    const alerts = [];
    if (form.travelClass !== 'Economy' && Number(form.ticketEstimate || 0) > 0) alerts.push({ title: 'Flight class exceeds allowed policy', detail: `Allowed: Economy · Selected: ${form.travelClass}` });
    if (Number(form.hotelCost || 0) > 5000) alerts.push({ title: 'Hotel limit exceeded', detail: `Allowed: ₹5000/night · Selected: ${money(form.hotelCost)}/night` });
    if (form.travelType === 'international') alerts.push({ title: 'International trip requires director approval', detail: 'Director approval will be added to the workflow.' });
    if (Number(form.dailyMealLimit || 0) > 1500) alerts.push({ title: 'Meal allowance limit exceeded', detail: `Allowed: ₹1500/day · Selected: ${money(form.dailyMealLimit)}/day` });
    const startDay = new Date(form.startDate).getDay();
    if (startDay === 0 || startDay === 6) alerts.push({ title: 'Weekend travel policy', detail: 'Weekend travel requires business justification.' });
    if (Number(form.advanceAmount || 0) > advanceEligible) alerts.push({ title: 'Advance eligibility exceeded', detail: `Eligible: ${money(advanceEligible)} · Requested: ${money(form.advanceAmount)}` });
    return alerts;
  }, [advanceEligible, estimate?.policyAlerts, form]);

  const workflow = useMemo(() => {
    const items = ['Employee Submission', 'Manager Approval'];
    if (Number(form.advanceAmount || 0) > 0 || estimatedTotal > 50000) items.push('Finance Approval');
    if (form.travelType === 'international' || estimatedTotal > 150000 || policyAlerts.some((alert) => alert.severity === 'high')) items.push('CFO Approval');
    return items;
  }, [estimatedTotal, form.advanceAmount, form.travelType, policyAlerts]);

  const setField = (field, value) => setForm((current) => {
    const next = { ...current, [field]: value };
    if (field === 'travelType') {
      next.sourceCountry = 'India';
      next.destinationCountry = 'India';
      next.sourceState = '';
      next.source = '';
      next.destinationState = '';
      next.destination = '';
    }
    if (field === 'sourceCountry') {
      next.sourceState = '';
      next.source = '';
    }
    if (field === 'destinationCountry') {
      next.destinationState = '';
      next.destination = '';
    }
    if (field === 'sourceState') {
      next.source = '';
    }
    if (field === 'destinationState') {
      next.destination = '';
    }
    if (field === 'destination' && value && !current.title) next.title = `${value} Business Trip`;
    if (field === 'destination' && value && !current.projectCode) next.projectCode = `PRJ-${String(value).slice(0, 3).toUpperCase()}-${new Date().getFullYear().toString().slice(-2)}`;
    if (field === 'department' && value && !current.costCenter) next.costCenter = `${String(value).slice(0, 3).toUpperCase()}-TRAVEL`;
    return next;
  });
  const toggleTravelAsset = (asset) => setForm((current) => {
    const existing = current.assetRequests || [];
    const assetId = String(asset._id || asset.id || asset.assetId);
    const selected = existing.some((item) => String(item.assetId) === assetId);
    return {
      ...current,
      assetRequests: selected
        ? existing.filter((item) => String(item.assetId) !== assetId)
        : [
          ...existing,
          {
            assetId,
            assetName: asset.assetName,
            assetCode: asset.assetCode,
            category: asset.category,
            notes: 'Temporary travel assignment'
          }
        ]
    };
  });
  const requiredForStep = (targetStep = step) => {
    if (targetStep === 0) {
      return [
        ['title', 'Trip Title'],
        ['purpose', 'Travel Purpose'],
        ['businessJustification', 'Business Justification'],
        ['employeeName', 'Employee Name'],
        ['department', 'Department'],
        ['startDate', 'Start Date'],
        ['endDate', 'End Date'],
        ['sourceCountry', 'Origin Country'],
        ['sourceState', 'Origin State'],
        ['source', 'Origin City'],
        ['sourceAddress', 'Origin Full Address'],
        ['sourcePinCode', 'Origin PIN Code'],
        ['destinationCountry', 'Destination Country'],
        ['destinationState', 'Destination State'],
        ['destination', 'Destination City'],
        ['destinationAddress', 'Destination Full Address'],
        ['destinationPinCode', 'Destination PIN Code']
      ];
    }
    if (targetStep === 1) return [['transportMode', 'Transportation'], ['travelClass', 'Travel Class']];
    if (targetStep === 2 && Number(form.advanceAmount || 0) > 0) return [['advanceJustification', 'Advance Justification']];
    return [];
  };
  const validateStep = (targetStep = step) => {
    if (form.endDate && form.startDate && new Date(form.endDate) < new Date(form.startDate)) {
      const msg = 'End Date cannot be before Start Date.';
      setFormError(msg);
      toast.error(msg);
      return false;
    }
    if (targetStep === 0 && form.sourcePinCode) {
      const isIndia = form.sourceCountry === 'India';
      const pin = String(form.sourcePinCode).trim();
      if (isIndia && !/^\d{6}$/.test(pin)) {
        const msg = 'Origin PIN Code must be 6 digits for India.';
        setFormError(msg);
        toast.error(msg);
        return false;
      }
      if (!isIndia && pin.length < 3) {
        const msg = 'Origin Postal / ZIP Code must be at least 3 characters.';
        setFormError(msg);
        toast.error(msg);
        return false;
      }
    }
    if (targetStep === 0 && form.destinationPinCode) {
      const isIndia = form.destinationCountry === 'India';
      const pin = String(form.destinationPinCode).trim();
      if (isIndia && !/^\d{6}$/.test(pin)) {
        const msg = 'Destination PIN Code must be 6 digits for India.';
        setFormError(msg);
        toast.error(msg);
        return false;
      }
      if (!isIndia && pin.length < 3) {
        const msg = 'Destination Postal / ZIP Code must be at least 3 characters.';
        setFormError(msg);
        toast.error(msg);
        return false;
      }
    }
    const missing = requiredForStep(targetStep).find(([field]) => !String(form[field] ?? '').trim());
    if (missing) {
      const msg = `${missing[1]} is required.`;
      setFormError(msg);
      toast.error(msg);
      return false;
    }
    setFormError('');
    return true;
  };
  const next = () => {
    if (!validateStep()) return;
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  };
  const back = () => setStep((current) => Math.max(0, current - 1));
  const submit = (status = 'SUBMITTED', addExpenses = false) => {
    const stepsToValidate = status === 'DRAFT' ? [0] : [0, 1, 2];
    if (!stepsToValidate.every((item) => validateStep(item))) return;
    onSubmit({
      title: form.title || `${form.destination || 'Business'} Trip`,
      purpose: buildPurpose(form),
      source: form.source,
      destination: form.multiCity && form.extraCities ? `${form.destination} via ${form.extraCities}` : form.destination,
      sourceCountry: form.sourceCountry,
      sourceState: form.sourceState,
      sourceAddress: form.sourceAddress,
      sourcePinCode: form.sourcePinCode,
      destinationCountry: form.destinationCountry,
      destinationState: form.destinationState,
      destinationAddress: form.destinationAddress,
      destinationPinCode: form.destinationPinCode,
      travelType: form.travelType,
      startDate: form.startDate,
      endDate: form.endDate,
      status,
      budget: { amount: estimatedTotal, currency: 'INR' },
      businessJustification: form.businessJustification,
      department: form.department,
      clientName: form.clientName,
      projectCode: form.projectCode,
      costCenter: form.costCenter,
      flexibleTravel: form.flexibleTravel,
      multiCity: form.multiCity,
      extraCities: form.extraCities,
      estimate,
      booking: {
        transportMode: form.transportMode,
        preferredAirline: form.preferredAirline,
        travelClass: form.travelClass,
        ticketEstimate,
        bookingRequired: form.bookingRequired
      },
      hotel: {
        hotelType: form.hotelType,
        hotelCost,
        roomPreference: form.roomPreference,
        nightsCount: nights
      },
      meals: {
        breakfast: form.breakfast,
        lunch: form.lunch,
        dinner: form.dinner,
        dailyMealLimit: estimate?.mealLimit ?? form.dailyMealLimit
      },
      advance: {
        requested: { amount: Number(form.advanceAmount || 0), currency: 'INR' },
        eligible: { amount: advanceEligible, currency: 'INR' },
        mode: form.advanceMode,
        justification: form.advanceJustification
      },
      assetRequests: form.assetRequests || [],
      itinerary: [
        { mode: form.transportMode, from: buildAddressLine({ address: form.sourceAddress, city: form.source, state: form.sourceState, country: form.sourceCountry, pinCode: form.sourcePinCode }), to: buildAddressLine({ address: form.destinationAddress, city: form.destination, state: form.destinationState, country: form.destinationCountry, pinCode: form.destinationPinCode }), startsAt: form.startDate, endsAt: form.endDate, reference: form.preferredAirline || form.travelClass },
        { mode: 'Hotel', from: buildAddressLine({ address: form.destinationAddress, city: form.destination, state: form.destinationState, country: form.destinationCountry, pinCode: form.destinationPinCode }), to: buildAddressLine({ address: form.destinationAddress, city: form.destination, state: form.destinationState, country: form.destinationCountry, pinCode: form.destinationPinCode }), startsAt: form.startDate, endsAt: form.endDate, reference: `${form.hotelType} · ${form.roomPreference}` }
      ],
      _clientAddExpenses: addExpenses
    });
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <Drawer open={open} title="Create Travel Request" description="Enterprise travel workflow with policy, budget, advance, and approval intelligence." onClose={onClose} className="max-w-5xl">
      <div className="panel overflow-hidden rounded-2xl">
        <div className="border-b border-slate-200 bg-slate-50/60 px-6 pb-4 pt-5 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            {STEPS.map((label, index) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${index <= step ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'}`}>{index + 1}</span>
                <span className={`hidden text-sm font-semibold lg:block ${index === step ? 'text-blue-600' : 'text-slate-400'}`}>{label}</span>
              </div>
            ))}
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} /></div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-2">
          {formError && (
            <div className="md:col-span-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">
              {formError}
            </div>
          )}
          {step === 0 && (
            <>
              <SectionTitle icon={BriefcaseBusiness} title="Basic Travel Details" />
              <Field label="Trip Title" required><input className="input" value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Business trip title" /></Field>
              <Field label="Travel Purpose" required><input className="input" value={form.purpose} onChange={(e) => setField('purpose', e.target.value)} placeholder="Customer meeting" /></Field>
              <div className="md:col-span-2"><Field label="Business Justification" required><textarea className="input min-h-20" value={form.businessJustification} onChange={(e) => setField('businessJustification', e.target.value)} placeholder="Explain business outcome, expected meetings, revenue impact..." /></Field></div>
              <Field label="Employee Name" required><input className="input" value={form.employeeName} onChange={(e) => setField('employeeName', e.target.value)} placeholder="Auto from profile or enter for reference" /></Field>
              <Field label="Department" required>
                <select className="input" value={form.department} onChange={(e) => setField('department', e.target.value)}>
                  <option value="">Select Department</option>
                  {departmentsList.map((dept) => (
                    <option key={dept._id} value={dept.name}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Travel Type" required><select className="input" value={form.travelType} onChange={(e) => setField('travelType', e.target.value)}><option value="domestic">Domestic</option><option value="international">International</option></select></Field>
              <Field label="Client Name"><input className="input" value={form.clientName} onChange={(e) => setField('clientName', e.target.value)} placeholder="Client name" /></Field>
              <Field label="Project Code"><input className="input" value={form.projectCode} onChange={(e) => setField('projectCode', e.target.value)} placeholder="PRJ-MUM-26" /></Field>
              <Field label="Cost Center"><input className="input" value={form.costCenter} onChange={(e) => setField('costCenter', e.target.value)} placeholder="CC-1042" /></Field>
              <SectionTitle icon={CalendarDays} title="Travel Date Details" />
              <Field label="Start Date" required><input className="input" type="date" value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} /></Field>
              <Field label="End Date" required><input className="input" type="date" value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} /></Field>
              <DetailTile label="Total Travel Days" value={`${days} day${days > 1 ? 's' : ''}`} />
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800 dark:text-white">Flexible Travel <input type="checkbox" checked={form.flexibleTravel} onChange={(e) => setField('flexibleTravel', e.target.checked)} /></label>
              <SectionTitle icon={MapPin} title="Locations" />
              <Field label="Origin Country" required>
                <select className="input" value={form.sourceCountry} onChange={(e) => setField('sourceCountry', e.target.value)}>
                  {sourceCountries.map((country) => <option key={country}>{country}</option>)}
                </select>
              </Field>
              <Field label="Destination Country" required>
                <select className="input" value={form.destinationCountry} onChange={(e) => setField('destinationCountry', e.target.value)}>
                  {destinationCountries.map((country) => <option key={country}>{country}</option>)}
                </select>
              </Field>
              <Field label="Origin State / Region" required>
                <select className="input" value={form.sourceState} onChange={(e) => setField('sourceState', e.target.value)} disabled={loadingSourceStates}>
                  <option value="">{loadingSourceStates ? 'Loading States...' : 'Select State / Region'}</option>
                  {sourceStates.map((state) => <option key={state}>{state}</option>)}
                </select>
              </Field>
              <Field label="Destination State / Region" required>
                <select className="input" value={form.destinationState} onChange={(e) => setField('destinationState', e.target.value)} disabled={loadingDestStates}>
                  <option value="">{loadingDestStates ? 'Loading States...' : 'Select State / Region'}</option>
                  {destinationStates.map((state) => <option key={state}>{state}</option>)}
                </select>
              </Field>
              <Field label="Origin City" required>
                <select className="input" value={form.source} onChange={(e) => setField('source', e.target.value)} disabled={loadingSourceCities}>
                  <option value="">{loadingSourceCities ? 'Loading Cities...' : 'Select City'}</option>
                  {sourceCities.map((city) => <option key={city}>{city}</option>)}
                </select>
              </Field>
              <Field label="Destination City" required>
                <select className="input" value={form.destination} onChange={(e) => setField('destination', e.target.value)} disabled={loadingDestCities}>
                  <option value="">{loadingDestCities ? 'Loading Cities...' : 'Select City'}</option>
                  {destinationCities.map((city) => <option key={city}>{city}</option>)}
                </select>
              </Field>
              
              {/* Trip Route Map Panel */}
              <TravelRouteVisualizer 
                sourceCity={form.source}
                sourceState={form.sourceState}
                sourceCountry={form.sourceCountry}
                destCity={form.destination}
                destState={form.destinationState}
                destCountry={form.destinationCountry}
                transportMode={form.transportMode}
              />

              <div className="space-y-3">
                {form.sourceAddress ? (
                  <div className="space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Origin Full Address <span className="text-rose-650">*</span></span>
                      <button 
                        type="button" 
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-750 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition"
                        onClick={() => {
                          setField('sourceAddress', '');
                          setField('sourcePinCode', '');
                        }}
                      >
                        Change Area / Search Again
                      </button>
                    </div>
                    <textarea className="input min-h-20" value={form.sourceAddress} onChange={(e) => setField('sourceAddress', e.target.value)} placeholder="Office, building, street, area" />
                  </div>
                ) : null}
                <InlineLocalMapPicker
                  city={form.source}
                  state={form.sourceState}
                  country={form.sourceCountry}
                  currentAddress={form.sourceAddress}
                  onSelectArea={(area) => {
                    setField('sourceAddress', area.address);
                    setField('sourcePinCode', area.pinCode);
                  }}
                  colorTheme="blue"
                />
              </div>

              <div className="space-y-3">
                {form.destinationAddress ? (
                  <div className="space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Destination Full Address <span className="text-rose-650">*</span></span>
                      <button 
                        type="button" 
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-750 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition"
                        onClick={() => {
                          setField('destinationAddress', '');
                          setField('destinationPinCode', '');
                        }}
                      >
                        Change Area / Search Again
                      </button>
                    </div>
                    <textarea className="input min-h-20" value={form.destinationAddress} onChange={(e) => setField('destinationAddress', e.target.value)} placeholder="Client office, hotel, venue, street, area" />
                  </div>
                ) : null}
                <InlineLocalMapPicker
                  city={form.destination}
                  state={form.destinationState}
                  country={form.destinationCountry}
                  currentAddress={form.destinationAddress}
                  onSelectArea={(area) => {
                    setField('destinationAddress', area.address);
                    setField('destinationPinCode', area.pinCode);
                  }}
                  colorTheme="rose"
                />
              </div>

              <Field label="Origin PIN Code" required>
                <input 
                  className="input" 
                  value={form.sourcePinCode} 
                  onChange={(e) => setField('sourcePinCode', form.sourceCountry === 'India' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value.slice(0, 10))} 
                  placeholder={form.sourceCountry === 'India' ? '380015' : 'ZIP / Postal Code'} 
                />
              </Field>

              <Field label="Destination PIN Code" required>
                <input 
                  className="input" 
                  value={form.destinationPinCode} 
                  onChange={(e) => setField('destinationPinCode', form.destinationCountry === 'India' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value.slice(0, 10))} 
                  placeholder={form.destinationCountry === 'India' ? '400001' : 'ZIP / Postal Code'} 
                />
              </Field>

              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800 dark:text-white">Multi-City Trip <input type="checkbox" checked={form.multiCity} onChange={(e) => setField('multiCity', e.target.checked)} /></label>
              {form.multiCity && <Field label="Additional Cities"><input className="input" value={form.extraCities} onChange={(e) => setField('extraCities', e.target.value)} placeholder="Delhi, Bengaluru" /></Field>}
            </>
          )}

          {step === 1 && (
            <>
              <SectionTitle icon={Plane} title="Transportation" />
              <Field label="Transportation" required><select className="input" value={form.transportMode} onChange={(e) => setField('transportMode', e.target.value)}><option>Flight</option><option>Train</option><option>Cab</option><option>Bus</option><option>Personal Vehicle</option></select></Field>
              <Field label="Preferred Airline"><input className="input" value={form.preferredAirline} onChange={(e) => setField('preferredAirline', e.target.value)} placeholder="IndiGo" /></Field>
              <Field label="Travel Class" required><select className="input" value={form.travelClass} onChange={(e) => setField('travelClass', e.target.value)}><option>Economy</option><option>Premium Economy</option><option>Business</option><option>First</option></select></Field>
              <Field label="Ticket Cost Estimate"><input className="input" type="number" value={form.ticketEstimate || ticketEstimate} onChange={(e) => setField('ticketEstimate', Number(e.target.value))} /></Field>
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800 dark:text-white">Booking Required <input type="checkbox" checked={form.bookingRequired} onChange={(e) => setField('bookingRequired', e.target.checked)} /></label>
              <SectionTitle icon={Hotel} title="Hotel Details" />
              <Field label="Hotel Type"><select className="input" value={form.hotelType} onChange={(e) => setField('hotelType', e.target.value)}><option>Business Standard</option><option>Budget</option><option>Premium</option><option>Executive</option></select></Field>
              <Field label="Estimated Hotel Cost / Night"><input className="input" type="number" value={form.hotelCost || hotelCost} onChange={(e) => setField('hotelCost', Number(e.target.value))} /></Field>
              <Field label="Room Preference"><select className="input" value={form.roomPreference} onChange={(e) => setField('roomPreference', e.target.value)}><option>Single</option><option>Twin Sharing</option><option>Accessible Room</option><option>Non-smoking</option></select></Field>
              <Field label="Nights Count"><input className="input" type="number" min="0" value={form.nightsCount} onChange={(e) => setField('nightsCount', Number(e.target.value))} /></Field>
              <SectionTitle icon={ReceiptText} title="Meal Allowance" />
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800 dark:text-white">Breakfast <input type="checkbox" checked={form.breakfast} onChange={(e) => setField('breakfast', e.target.checked)} /></label>
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800 dark:text-white">Lunch <input type="checkbox" checked={form.lunch} onChange={(e) => setField('lunch', e.target.checked)} /></label>
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800 dark:text-white">Dinner <input type="checkbox" checked={form.dinner} onChange={(e) => setField('dinner', e.target.checked)} /></label>
              <Field label="Daily Limit"><input className="input" type="number" value={form.dailyMealLimit} onChange={(e) => setField('dailyMealLimit', Number(e.target.value))} /></Field>
            </>
          )}

          {step === 2 && (
            <>
              <SectionTitle icon={WalletCards} title="Budget Section" />
              <DetailTile label="Estimated Total Cost" value={money(estimatedTotal)} />
              <DetailTile label="Department Budget Remaining" value={money(departmentBudget)} />
              <DetailTile label="Policy Allowed Budget" value={money(policyAllowedBudget)} />
              <DetailTile label="Advance Eligibility" value={money(advanceEligible)} />
              <SectionTitle icon={Landmark} title="Advance Request" />
              <Field label="Advance Amount"><input className="input" type="number" value={form.advanceAmount} onChange={(e) => setField('advanceAmount', Number(e.target.value))} /></Field>
              <Field label="Payment Mode"><select className="input" value={form.advanceMode} onChange={(e) => setField('advanceMode', e.target.value)}><option value="bank_transfer">Bank Transfer</option><option value="payroll">Payroll</option><option value="upi">UPI</option><option value="wallet">Wallet</option></select></Field>
              <div className="md:col-span-2"><Field label="Advance Justification" required={Number(form.advanceAmount || 0) > 0}><textarea className="input min-h-20" value={form.advanceJustification} onChange={(e) => setField('advanceJustification', e.target.value)} placeholder="Why is advance needed before travel?" /></Field></div>
              <SectionTitle icon={BriefcaseBusiness} title="Temporary Travel Assets" />
              <div className="md:col-span-2 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                {travelAssetsLoading ? (
                  <p className="text-sm font-semibold text-slate-500">Loading available assets...</p>
                ) : availableTravelAssets.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {availableTravelAssets.slice(0, 8).map((asset) => {
                      const assetId = String(asset._id || asset.id || asset.assetId);
                      const selected = (form.assetRequests || []).some((item) => String(item.assetId) === assetId);
                      return (
                        <label key={assetId} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${selected ? 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100' : 'border-slate-200 dark:border-slate-800 dark:text-slate-100'}`}>
                          <input type="checkbox" className="mt-1 h-4 w-4" checked={selected} onChange={() => toggleTravelAsset(asset)} />
                          <span className="min-w-0">
                            <span className="block font-bold">{asset.assetName || asset.assetCode || 'Travel asset'}</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">{asset.assetCode || asset.serialNumber || '-'} · {asset.category || 'Asset'}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-slate-500">No available travel assets found.</p>
                )}
              </div>
              <SectionTitle icon={CircleDollarSign} title="Auto Calculations" />
              <DetailTile label="Per Diem" value={money(perDiem)} />
              <DetailTile label="Total Stay Allowance" value={money(stayAllowance)} />
              <DetailTile label="Local Transport Estimate" value={money(localTransport)} />
              <DetailTile label="Travel Reimbursement Estimate" value={money(Math.max(0, estimatedTotal - Number(form.advanceAmount || 0)))} />
              <DetailTile label="Remaining Balance After Advance" value={money(Math.max(0, Number(form.advanceAmount || 0) - estimatedTotal))} />
            </>
          )}

          {step === 3 && (
            <>
              <SectionTitle icon={ShieldCheck} title="Real-Time Policy Engine" description="Policy checks are calculated locally before submission and revalidated during approval." />
              <div className="md:col-span-2 space-y-3">
                {policyAlerts.length ? policyAlerts.map((alert) => (
                  <div key={alert.title} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                    <p className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" /> {alert.title}</p>
                    <p className="mt-1">{alert.detail}</p>
                  </div>
                )) : (
                  <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Policy checks passed</p>
                )}
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
                  <p className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4" /> AI Travel Assistant</p>
                  <p className="mt-1">Suggested hotel category: Business Standard. This trip budget utilization is {Math.min(100, Math.round((estimatedTotal / policyAllowedBudget) * 100))}%.</p>
                  {policyAlerts.length > 0 && <p className="mt-2 font-semibold">Recommendation: Use economy class and cap hotel cost to ₹5000/night to reduce policy exceptions.</p>}
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <SectionTitle icon={Route} title="Approval Workflow Preview" />
              <div className="md:col-span-2 grid gap-5 xl:grid-cols-[1fr_320px]">
                <div className="space-y-3">
                  {workflow.map((item, index) => (
                    <div key={item} className="relative flex gap-3">
                      {index < workflow.length - 1 && <div className="absolute left-4 top-8 h-full w-px bg-slate-200 dark:bg-slate-800" />}
                      <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${index === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>{index + 1}</div>
                      <div className="min-w-0 flex-1 rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-slate-800 dark:text-white">{item}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <DetailTile label="Estimated Approval Time" value={workflow.length > 4 ? '3-5 business days' : '1-2 business days'} />
                  <DetailTile label="Required Approvers" value={workflow.slice(1).join(', ') || 'None'} />
                  <DetailTile label="Escalation Conditions" value={policyAlerts.length ? 'Policy exception or SLA breach' : 'SLA breach only'} />
                </div>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <SectionTitle icon={FileText} title="Review & Submit" />
              <div className="md:col-span-2 grid gap-3 md:grid-cols-4">
                <DetailTile label="Estimated Budget" value={money(estimatedTotal)} />
                <DetailTile label="Advance Requested" value={money(form.advanceAmount)} />
                <DetailTile label="Total Travel Days" value={`${days} day${days > 1 ? 's' : ''}`} />
                <DetailTile label="Destination" value={formatLocation(form.destination, form.destinationState, form.destinationCountry)} />
                <DetailTile label="Travel Type" value={form.travelType} />
                <DetailTile label="Temporary Assets" value={(form.assetRequests || []).length ? `${form.assetRequests.length} selected` : 'None'} />
                <DetailTile label="Policy Status" value={policyAlerts.length ? 'Exceptions found' : 'Compliant'} />
                <DetailTile label="Approval Workflow" value={workflow.join(' > ')} />
                <DetailTile label="Reimbursement Estimate" value={money(Math.max(0, estimatedTotal - Number(form.advanceAmount || 0)))} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Budget available</p>
                {policyAlerts.length ? <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200"><AlertTriangle className="h-4 w-4" /> Additional approval required</p> : <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Policy checks passed</p>}
              </div>
            </>
          )}

          <div className="flex justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 md:col-span-2">
            <button type="button" className="btn-secondary flex items-center gap-2" onClick={step === 0 ? onClose : back}>{step === 0 ? <X className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}{step === 0 ? 'Cancel' : 'Back'}</button>
            <div className="flex flex-wrap justify-end gap-3">
              {step === STEPS.length - 1 && <button type="button" className="btn-secondary" onClick={() => submit('DRAFT')} disabled={isSaving}>Save Draft</button>}
              {step === STEPS.length - 1 && <button type="button" className="btn-secondary flex items-center gap-2" onClick={() => submit('SUBMITTED', true)} disabled={isSaving}><Plus className="h-4 w-4" /> Submit & Add Expenses</button>}
              {step === STEPS.length - 1 ? <button type="button" className="btn-primary flex items-center gap-2" onClick={() => submit('SUBMITTED')} disabled={isSaving}><Send className="h-4 w-4" /> Submit Trip Request</button> : <button type="button" className="btn-primary flex items-center gap-2" onClick={next}>Continue <ChevronRight className="h-4 w-4" /></button>}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Address Map Selector Modal */}
      <AddressMapSelector
        open={showMapSelector}
        onClose={() => setShowMapSelector(false)}
        onConfirm={handleMapConfirm}
        city={mapTargetField === 'source' ? form.source : form.destination}
        state={mapTargetField === 'source' ? form.sourceState : form.destinationState}
        country={mapTargetField === 'source' ? form.sourceCountry : form.destinationCountry}
      />
    </Drawer>
  );
};

const TravelDetails = ({ trip, expenses, onClose }) => {
  const [tab, setTab] = useState('overview');
  const linkedExpenses = expenses.filter((expense) => String(expense.tripId || expense.travelRequestId || '') === String(trip._id));
  const linkedSpend = linkedExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const budgetAmount = Number(trip.budget?.amount || trip.estimatedCost || 0);
  const advance = Math.round(budgetAmount * 0.35);
  const settlementDue = Math.max(0, linkedSpend - advance);
  const refundDue = Math.max(0, advance - linkedSpend);
  const utilization = budgetAmount ? Math.min(100, Math.round((linkedSpend / budgetAmount) * 100)) : 0;
  const tabs = ['Overview', 'Itinerary', 'Linked Expenses', 'Approval Timeline', 'Budget Tracking', 'Advances & Settlement', 'Policy Violations', 'Audit Logs'];

  return (
    <Drawer open={Boolean(trip)} title={trip?.title || 'Travel Details'} description={`${trip?.travelId || 'Trip'} · ${trip?.destination || '-'}`} onClose={onClose} className="max-w-5xl">
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {tabs.map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${tab === item ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}>{item}</button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <section className="panel p-6">
            <h3 className="mb-4 font-bold dark:text-white">Trip Information</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <DetailTile label="Employee" value={trip.employeeId?.name || 'Me'} />
              <DetailTile label="Department" value={trip.employeeId?.department || '-'} />
              <DetailTile label="Travel Type" value={trip.travelType} />
              <DetailTile label="Origin" value={formatLocation(trip.source, trip.sourceState, trip.sourceCountry)} />
              <DetailTile label="Destination" value={formatLocation(trip.destination, trip.destinationState, trip.destinationCountry)} />
              <DetailTile label="Travel Dates" value={`${trip.startDate ? new Date(trip.startDate).toLocaleDateString('en-IN') : '-'} - ${trip.endDate ? new Date(trip.endDate).toLocaleDateString('en-IN') : '-'}`} />
              <DetailTile label="Status" value={trip.status} />
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300"><b>Purpose:</b><br />{trip.purpose || '-'}</div>
          </section>
          <section className="panel p-6">
            <h3 className="mb-4 font-bold dark:text-white">AI Travel Insights</h3>
            <div className="space-y-3">
              <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">Suggested hotel category: Business Standard</p>
              <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Trip budget utilization: {utilization}%</p>
              {utilization > 80 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">This trip is approaching budget. Review hotel and flight costs before settlement.</p>}
            </div>
          </section>
        </div>
      )}

      {tab === 'Itinerary' && (
        <section className="panel p-6">
          <h3 className="mb-4 font-bold dark:text-white">Itinerary</h3>
          <div className="space-y-3">
            {(trip.itinerary || []).map((item, index) => (
              <div key={index} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="font-bold dark:text-white">{item.mode} · {item.from} to {item.to}</p>
                <p className="text-sm text-slate-500">{item.reference || 'Booking reference pending'}</p>
              </div>
            ))}
            {!trip.itinerary?.length && <EmptyState title="No itinerary added" description="Transport and hotel details will appear here after request creation." />}
          </div>
        </section>
      )}

      {tab === 'Linked Expenses' && (
        <section className="panel p-6">
          <h3 className="mb-4 font-bold dark:text-white">Linked Expenses</h3>
          {linkedExpenses.length ? <DataTable data={linkedExpenses} columns={[
            { header: 'Category', accessorKey: 'category' },
            { header: 'Merchant', accessorKey: 'merchant' },
            { header: 'Amount', cell: ({ row }) => money(row.original.amount, row.original.currency) },
            { header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> }
          ]} /> : <EmptyState title="No linked expenses" description="Hotel, flight, taxi, meals, fuel, and entertainment expenses linked to this trip will appear here." />}
        </section>
      )}

      {tab === 'Approval Timeline' && (
        <section className="panel p-6">
          <h3 className="mb-4 font-bold dark:text-white">Approval Timeline</h3>
          <div className="space-y-3">
            {(trip.approvalPath?.length ? trip.approvalPath : [{ approverRole: 'manager', status: trip.status === 'DRAFT' ? 'pending' : 'pending' }, { approverRole: 'finance', status: 'pending' }, { approverRole: 'travel_desk', status: 'pending' }]).map((item, index) => (
              <div key={index} className="relative flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800">{index + 1}</div>
                <div className="flex-1 rounded-xl border border-slate-200 p-3 dark:border-slate-800"><p className="font-semibold capitalize dark:text-white">{String(item.approverRole).replaceAll('_', ' ')}</p><StatusBadge status={item.status} /></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'Budget Tracking' && (
        <section className="panel p-6">
          <h3 className="mb-4 font-bold dark:text-white">Budget Tracking</h3>
          <div className="grid gap-3 md:grid-cols-4">
            <DetailTile label="Approved Budget" value={money(budgetAmount, trip.budget?.currency)} />
            <DetailTile label="Linked Spend" value={money(linkedSpend, trip.budget?.currency)} />
            <DetailTile label="Remaining Budget" value={money(Math.max(0, budgetAmount - linkedSpend), trip.budget?.currency)} />
            <DetailTile label="Utilization" value={`${utilization}%`} />
          </div>
        </section>
      )}

      {tab === 'Advances & Settlement' && (
        <section className="panel p-6">
          <h3 className="mb-4 font-bold dark:text-white">Advances & Settlement</h3>
          <div className="grid gap-3 md:grid-cols-4">
            <DetailTile label="Advance Used" value={money(Math.min(advance, linkedSpend), trip.budget?.currency)} />
            <DetailTile label="Remaining Balance" value={money(Math.max(0, advance - linkedSpend), trip.budget?.currency)} />
            <DetailTile label="Refund Due" value={money(refundDue, trip.budget?.currency)} />
            <DetailTile label="Extra Reimbursement" value={money(settlementDue, trip.budget?.currency)} />
          </div>
        </section>
      )}

      {tab === 'Policy Violations' && (
        <section className="panel p-6">
          <h3 className="mb-4 font-bold dark:text-white">Policy Violations</h3>
          {budgetAmount > 150000 || trip.travelType === 'international' ? (
            <div className="space-y-3">
              {trip.travelType === 'international' && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">International trip requires director approval.</p>}
              {budgetAmount > 150000 && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">Trip exceeds standard domestic budget threshold.</p>}
            </div>
          ) : <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">No travel policy violations detected.</p>}
        </section>
      )}

      {tab === 'Audit Logs' && (
        <section className="panel p-6">
          <h3 className="mb-4 font-bold dark:text-white">Audit Logs</h3>
          <div className="space-y-3">
            {[
              ['Travel request changes', `Request ${trip.travelId || trip._id} created or updated.`],
              ['Approval actions', `${trip.approvalPath?.length || 0} approval step(s) recorded.`],
              ['Budget updates', `Budget calculated at ${money(budgetAmount, trip.budget?.currency)}.`],
              ['Advance payments', 'Advance eligibility and settlement balance calculated.'],
              ['Settlement adjustments', `${linkedExpenses.length} linked expense(s) evaluated.`]
            ].map(([title, detail]) => <div key={title} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"><p className="font-bold dark:text-white">{title}</p><p className="text-slate-500">{detail}</p></div>)}
          </div>
        </section>
      )}
    </Drawer>
  );
};

export const Travel = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const toast = useToast();
  const canCreate = usePermission('trips', 'create');
  const canApprove = usePermission('trips', 'approve');
  const [showWizard, setShowWizard] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const { data = [] } = useQuery({ queryKey: ['travel-requests'], queryFn: api.travelRequests });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses', 'travel-linking'], queryFn: () => api.expenses({ mine: 'true' }) });
  const create = useMutation({
    mutationFn: api.createTravelRequest,
    onSuccess: (_trip, variables) => {
      queryClient.invalidateQueries({ queryKey: ['travel-requests'] });
      setShowWizard(false);
      if (variables?._clientAddExpenses) navigate('/expenses?new=true');
    }
  });
  const action = useMutation({
    mutationFn: ({ id, payload }) => api.actTravelRequest(id, payload),
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: ['travel-requests'] });
      setSelectedTrip((current) => (current?._id === trip?._id ? trip : current));
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Travel action failed')
  });

  const stats = useMemo(() => {
    const total = data.length;
    const pending = data.filter((item) => ['SUBMITTED', 'PENDING_MANAGER', 'PENDING_FINANCE', 'PENDING_CFO'].includes(item.status)).length;
    const active = data.filter((item) => ['APPROVED', 'SETTLEMENT_PENDING'].includes(item.status)).length;
    const upcoming = data.filter((item) => item.startDate && new Date(item.startDate) >= new Date()).length;
    const budget = data.reduce((sum, item) => sum + Number(item.budget?.amount || item.estimatedCost || 0), 0);
    const linked = expenses.filter((expense) => expense.tripId).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const pendingSettlements = data.filter((item) => item.status === 'SETTLEMENT_PENDING').length;
    const international = data.filter((item) => item.travelType === 'international').length;
    return { total, pending, active, upcoming, budget, linked, pendingSettlements, international };
  }, [data, expenses]);

  const monthlySpend = useMemo(() => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, index) => ({
    month,
    spend: Math.round((stats.budget / 6) * (0.65 + index * 0.08)) || [22000, 34000, 28000, 46000, 39000, 52000][index]
  })), [stats.budget]);
  const categoryAnalytics = [
    { name: 'Flight', value: 42 },
    { name: 'Hotel', value: 28 },
    { name: 'Meals', value: 14 },
    { name: 'Taxi', value: 10 },
    { name: 'Other', value: 6 }
  ];
  const destinations = useMemo(() => Object.entries(data.reduce((acc, trip) => {
    const destination = trip.destination || 'Unassigned';
    acc[destination] = (acc[destination] || 0) + 1;
    return acc;
  }, {})).slice(0, 5), [data]);

  const columns = useMemo(() => [
    { header: 'Travel ID', accessorKey: 'travelId' },
    { header: 'Employee', cell: ({ row }) => row.original.employeeId?.name || row.original.employeeName || user?.name || '-' },
    { header: 'Trip', accessorKey: 'title' },
    { header: 'Destination', cell: ({ row }) => formatLocation(row.original.destination, row.original.destinationState, row.original.destinationCountry) },
    { header: 'Travel Type', cell: ({ row }) => <span className="capitalize">{row.original.travelType || 'domestic'}</span> },
    { header: 'Budget', cell: ({ row }) => money(row.original.budget?.amount || row.original.estimatedCost, row.original.budget?.currency) },
    { header: 'Linked Expenses', cell: ({ row }) => row.original.linkedExpenses?.length || expenses.filter((expense) => String(expense.tripId || '') === String(row.original._id)).length },
    { header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} /> },
    {
      header: 'Action',
      cell: ({ row }) => {
        const trip = row.original;
        const hasPendingApproval = trip.approvalPath?.some((step) => step.status === 'pending') || String(trip.status || '').startsWith('PENDING_');
        const pendingForRole = ['company_admin', 'super_admin'].includes(user?.role)
          ? hasPendingApproval
          : trip.status === `PENDING_${String(user?.role || '').toUpperCase()}` || (user?.role === 'manager' && trip.status === 'PENDING_MANAGER');
        return (
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary py-1.5 text-xs" onClick={() => setSelectedTrip(trip)}>Details</button>
            {canApprove && pendingForRole && (
              <>
                <button className="btn-primary py-1.5 text-xs" disabled={action.isPending} onClick={() => action.mutate({ id: trip._id, payload: { action: 'approve' } })}>Approve</button>
                <button className="btn-secondary py-1.5 text-xs text-rose-600" disabled={action.isPending} onClick={() => action.mutate({ id: trip._id, payload: { action: 'send_back', note: 'Needs update' } })}>Send Back</button>
              </>
            )}
          </div>
        );
      }
    }
  ], [action, canApprove, expenses, user?.name, user?.role]);
  const requestTableTitle = user?.role === 'finance' ? 'Finance Travel Verification Queue' : user?.role === 'manager' ? 'Team Travel Approval Queue' : 'My Travel Requests';

  return (
    <>
      <PageHeader
        title="Travel"
        description="Travel request, approval, expense linking, settlement, and finance verification."
        actions={canCreate && <button className="btn-primary flex items-center gap-2" onClick={() => setShowWizard(true)}><Plus className="h-4 w-4" /> New Trip</button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Trips" value={stats.total} icon={Plane} />
        <StatCard label="Active Trips" value={stats.active} icon={Route} tone="green" />
        <StatCard label="Pending Approvals" value={stats.pending} icon={Clock3} tone="amber" />
        <StatCard label="Upcoming Travel" value={stats.upcoming} icon={CalendarDays} />
        <StatCard label="Budget Utilization" value={money(stats.linked || stats.budget * 0.42)} icon={Gauge} />
        <StatCard label="Pending Settlements" value={stats.pendingSettlements} icon={ReceiptText} tone="amber" />
        <StatCard label="Advance Outstanding" value={money(Math.round(stats.budget * 0.28))} icon={Landmark} />
        <StatCard label="Policy Violations" value={stats.international} icon={AlertTriangle} tone={stats.international ? 'rose' : 'green'} />
      </div>

      <section className="panel mb-5 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="font-bold dark:text-white">{requestTableTitle}</h2>
            <p className="text-sm text-slate-500">Submitted trips, current approval status, and role-based actions are tracked here.</p>
          </div>
        </div>
        {data.length ? <DataTable data={data} columns={columns} /> : <div className="p-5"><EmptyState title="No trips yet" description="Create a travel request to start manager and finance approval." /></div>}
      </section>

      <div className="mb-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <section className="panel p-5">
          <div className="mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-blue-600" /><h2 className="font-bold dark:text-white">Monthly Travel Spend</h2></div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySpend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `₹${Math.round(value / 1000)}k`} />
                <Tooltip formatter={(value) => money(value)} />
                <Area type="monotone" dataKey="spend" stroke="#2563eb" fill="#dbeafe" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel p-5">
          <div className="mb-4 flex items-center gap-2"><Train className="h-4 w-4 text-blue-600" /><h2 className="font-bold dark:text-white">Travel Category Analytics</h2></div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryAnalytics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>{categoryAnalytics.map((entry, index) => <Cell key={entry.name} fill={chartColor[index % chartColor.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <section className="panel p-5">
          <h2 className="mb-3 font-bold dark:text-white">Frequent Destinations</h2>
          <div className="space-y-2">{destinations.length ? destinations.map(([destination, count]) => <div key={destination} className="flex justify-between rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800"><span>{destination}</span><b>{count}</b></div>) : <p className="text-sm text-slate-500">No destination history yet.</p>}</div>
        </section>
        <section className="panel p-5">
          <h2 className="mb-3 font-bold dark:text-white">Department Travel Trends</h2>
          {['Sales', 'Operations', 'Finance'].map((dept, index) => <div key={dept} className="mb-3"><div className="flex justify-between text-sm"><span>{dept}</span><b>{35 + index * 18}%</b></div><div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-600" style={{ width: `${35 + index * 18}%` }} /></div></div>)}
        </section>
        <section className="panel p-5">
          <h2 className="mb-3 font-bold dark:text-white">Travel Risk Alerts</h2>
          <div className="space-y-2">
            {stats.international > 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">International trips require director approval and passport compliance checks.</p>}
            <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">Expense reminders will trigger at trip end for settlement closure.</p>
            <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Advance payment notifications are ready for finance release.</p>
          </div>
        </section>
      </div>

      <TravelWizard open={showWizard} onClose={() => setShowWizard(false)} onSubmit={(payload) => create.mutate(payload)} isSaving={create.isPending} user={user} />
      {selectedTrip && <TravelDetails trip={selectedTrip} expenses={expenses} onClose={() => setSelectedTrip(null)} />}
    </>
  );
};
