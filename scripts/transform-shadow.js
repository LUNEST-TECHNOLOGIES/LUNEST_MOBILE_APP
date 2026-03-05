module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);
  let dirty = false;

  root.find(j.ObjectExpression).forEach(path => {
    let shadowColor = null, shadowOffset = null, shadowOpacity = null, shadowRadius = null;

    path.node.properties.forEach(prop => {
      // Handle standard properties
      if (j.Property.check(prop) && prop.key && prop.key.name) {
        if (prop.key.name === 'shadowColor') shadowColor = prop.value;
        if (prop.key.name === 'shadowOffset') shadowOffset = prop.value;
        if (prop.key.name === 'shadowOpacity') shadowOpacity = prop.value;
        if (prop.key.name === 'shadowRadius') shadowRadius = prop.value;
      }
      // Handle string literal keys (e.g. 'shadowColor')
      if (j.Property.check(prop) && prop.key && prop.key.type === 'StringLiteral') {
        if (prop.key.value === 'shadowColor') shadowColor = prop.value;
        if (prop.key.value === 'shadowOffset') shadowOffset = prop.value;
        if (prop.key.value === 'shadowOpacity') shadowOpacity = prop.value;
        if (prop.key.value === 'shadowRadius') shadowRadius = prop.value;
      }
    });

    if (shadowColor || shadowOffset || shadowOpacity || shadowRadius) {
      // It's a shadow block. Let's collect values and construct boxShadow.
      // Default values React Native uses:
      let colorStr = shadowColor && shadowColor.value ? shadowColor.value : "#000000";
      let offX = 0, offY = 0;
      
      if (shadowOffset && shadowOffset.properties) {
        shadowOffset.properties.forEach(p => {
          if (p.key && p.key.name === 'width' && p.value) offX = p.value.value || 0;
          if (p.key && p.key.name === 'height' && p.value) offY = p.value.value || 0;
        });
      }
      
      let opac = shadowOpacity && shadowOpacity.value !== undefined ? shadowOpacity.value : 1;
      let rad = shadowRadius && shadowRadius.value !== undefined ? shadowRadius.value : 0;

      let rgba = colorStr;
      
      // Attempt to convert to rgba if opacity < 1
      if (opac !== 1) {
        if (colorStr.startsWith('#')) {
          let hex = colorStr.replace('#', '');
          if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
          if (hex.length === 6) {
            let r = parseInt(hex.substring(0,2), 16);
            let g = parseInt(hex.substring(2,4), 16);
            let b = parseInt(hex.substring(4,6), 16);
            rgba = `rgba(${r}, ${g}, ${b}, ${opac})`;
          } else if (hex.length === 8) {
             // If caller already has an alpha channel, we could multiply it but we'll leave it simple
             rgba = `rgba(${parseInt(hex.substring(0,2), 16)}, ${parseInt(hex.substring(2,4), 16)}, ${parseInt(hex.substring(4,6), 16)}, ${opac})`;
          }
        } else if (colorStr.startsWith('rgba')) {
            // Do not override if already rgba
        } else if (colorStr.toLowerCase() === 'black') {
            rgba = `rgba(0, 0, 0, ${opac})`;
        } else if (colorStr.toLowerCase() === 'white') {
            rgba = `rgba(255, 255, 255, ${opac})`;
        }
      }

      let bsStr = `${offX}px ${offY}px ${rad}px ${rgba}`;
      
      // Remove the old props
      path.node.properties = path.node.properties.filter(p => {
        if (j.Property.check(p) && p.key) {
           let keyName = p.key.name || (p.key.type === 'StringLiteral' ? p.key.value : null);
           if (['shadowColor', 'shadowOffset', 'shadowOpacity', 'shadowRadius'].includes(keyName)) {
               return false;
           }
        }
        return true;
      });

      // Add boxShadow
      path.node.properties.push(
        j.property('init', j.identifier('boxShadow'), j.literal(bsStr))
      );
      dirty = true;
    }
  });

  return dirty ? root.toSource() : null;
};
