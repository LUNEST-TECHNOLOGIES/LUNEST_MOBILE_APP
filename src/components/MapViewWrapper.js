// Web fallback - returns null stubs so components use placeholder UI
// Native platforms use MapViewWrapper.native.js instead


// On web, always use stubs
const MapView = null;
const Marker = null;
const PROVIDER_GOOGLE = "google";

export { MapView, Marker, PROVIDER_GOOGLE };
export default MapView;
