import Svg, { Path } from 'react-native-svg';

/**
 * Success Checkmark Icon Component
 * Green checkmark in circle for success states
 *
 * @param {number} size - Icon size in pixels (default: 60)
 * @returns {JSX.Element} SVG success checkmark icon
 */
const SuccessCheckIcon = ({ size = 60 }) => (
  <Svg width={size} height={size} viewBox="0 0 60 60" fill="none">
    <Path
      d="M30 55C43.8071 55 55 43.8071 55 30C55 16.1929 43.8071 5 30 5C16.1929 5 5 16.1929 5 30C5 43.8071 16.1929 55 30 55Z"
      fill="#4CAF50"
    />
    <Path
      d="M26.25 38.75L17.5 30L20.0375 27.4625L26.25 33.6625L39.9625 19.95L42.5 22.5L26.25 38.75Z"
      fill="white"
    />
  </Svg>
);

export default SuccessCheckIcon;
