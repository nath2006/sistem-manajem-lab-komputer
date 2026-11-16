/* eslint-disable no-unused-vars */
import React from 'react';
import { useSettings } from '../Context/SettingsContext';

const Footer = () => {
  const { settings } = useSettings();
  return (
      <footer className="bg-white shadow-2xl text-gray-900 py-4 rounded-xl max-w-7xl mx-auto w-full">
          <div className="text-center">
                <p className="text-sm md:text-md" style={{ color: 'var(--dashboard-accent, var(--color-maroon))' }}>
                  Copyright © 2025. {settings.school_name}. Develop by nath2006 (github username)
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--dashboard-accent, color-mix(in srgb, var(--color-maroon) 80%, transparent))' }}>Versi 1.0.2</p>
              </div>
            </footer>
  );
};


export default Footer;
