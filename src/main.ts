fetch('assets/config.json')
  .then(response => response.json())
  .then(config => {
    (window as any).API_BASE_URL = config.apiUrl;
  })
  .catch(err => {
    console.warn('Could not load assets/config.json, falling back to default API url', err);
    (window as any).API_BASE_URL = 'https://pharmacyapp-oekk.onrender.com';
  })
  .finally(() => {
    import('./bootstrap').catch(err => console.error(err));
  });
