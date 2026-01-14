// Provider logo URLs mapping
export const providerLogos = {
  'Pragmatic Play': '/pragmaticplay.png',
  'Hacksaw': '/hacksaw.png',
  'Nolimit City': '/nolimit.png',
  'RAW': '/raw.png',
  'Raw': '/raw.png',
  'Raw iGaming': '/raw.png',
  'Belatra': '/belatra.png',
  '3 Oaks': '/3oaks.png',
  '3 Oaks Gaming': '/3oaks.png',
  '777': '/777.png'
};

// Fallback function to get provider logo
export const getProviderLogo = (provider) => {
  if (!provider) return null;
  
  // Try exact match first
  if (providerLogos[provider]) {
    return providerLogos[provider];
  }
  
  // Try case-insensitive match
  const matchedKey = Object.keys(providerLogos).find(
    key => key.toLowerCase() === provider.toLowerCase()
  );
  
  return matchedKey ? providerLogos[matchedKey] : null;
};
