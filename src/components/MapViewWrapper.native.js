// Native platforms: export real MapView and Marker from react-native-maps
import MapViewLib, { Marker, PROVIDER_GOOGLE } from "react-native-maps";

export { Marker, PROVIDER_GOOGLE };
export const MapView = MapViewLib;
export default MapViewLib;
