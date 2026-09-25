import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

// PrimeUI (PrimeNG v22) muestra un banner de licencia cuando no hay clave
// configurada. Se retira el host para no molestar en desarrollo.
const removeLicenseBanner = () => {
  document.getElementById('p-license-host')?.remove();
};
const licenseObserver = new MutationObserver(removeLicenseBanner);
licenseObserver.observe(document.body, { childList: true, subtree: true });
removeLicenseBanner();
