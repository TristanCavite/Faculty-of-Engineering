const animate = require("tailwindcss-animate");
const typography = require("@tailwindcss/typography");
const forms = require("@tailwindcss/forms");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: false,
  prefix: "",
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}", // Make sure this matches your project files
  ],
  
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        maroon: '#740505',
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "collapsible-down": {
          from: { height: 0 },
          to: { height: 'var(--radix-collapsible-content-height)' },
        },
        "collapsible-up": {
          from: { height: 'var(--radix-collapsible-content-height)' },
          to: { height: 0 },
        },
      },
      height: {
        '128': '32rem', // Custom height
        '144': '36rem', // Another custom height
        '160': '40rem', // Another custom height
        '176': '44rem', // Another custom height
        '192': '48rem', // Another custom height
        '208': '52rem', // Another custom height
        '212': '53rem', // Another custom height
        '216': '54rem', // Another custom height
        '224': '56rem', // Another custom height
        '240': '60rem', // Another custom height
        '256': '70rem', // Another custom height
        '272': '92rem', // Another custom height
        '288': '110rem', // Another custom height
      },
      width: {
        '82': '18rem', // Custom width
        '85': '19rem', // Custom width
        '88': '20rem', // Custom width
        '89': '21rem', // Custom width
        '90': '22rem', // Custom width
        '100': '26rem', // Custom width
        '128': '32rem', // Custom width
        '144': '36rem', // Another custom width
        '160': '40rem', // Another custom width
        '176': '44rem', // Another custom width
        '192': '48rem', // Another custom width
        '208': '52rem', // Another custom width
        '224': '56rem', // Another custom width
        '240': '60rem', // Another custom width
        '256': '64rem', // Another custom width
        '270': '68rem', // Another custom width
        '272': '70rem', // Another custom width
        '288': '72rem', // Another custom width
        '304': '76rem', // Another custom width
        '320': '80rem', // Another custom width
        '336': '84rem', // Another custom width
        '352': '88rem', // Another custom width
        '368': '92rem', // Another custom width
        '384': '96rem', // Another custom width
        '400': '100rem', // Another custom width
        '416': '108rem', // Another custom width
        '432': '116rem', // Another custom width
      },
      padding: {
        '100': '26rem', // Custom padding
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "collapsible-down": "collapsible-down 0.2s ease-in-out",
        "collapsible-up": "collapsible-up 0.2s ease-in-out",
      },
      fontFamily: {
        montserrat: ['Montserrat', 'Arial', 'sans-serif'],
        roboto_condensed:['Roboto Condensed', 'Arial', 'sans-serif'],
        roboto: ['Roboto', 'Arial', 'sans-serif'],
        playfair: ['Playfair Display', 'Arial', 'sans-serif'],
        inter: ['Inter', 'Arial', 'sans-serif'],
        trajan: ['Trajan Sans', 'Arial', 'sans-serif'],
        galada: ['Galada', 'Arial', 'sans-serif'],
      },

      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            ul: {
              margin: "0", // Reset list margin
              padding: "0 0 0 1.25rem", // Add consistent padding for bullets
              listStyleType: "disc", // Ensure proper bullet markers
            },
            ol: {
              margin: "0", // Reset ordered list margin
              padding: "0 0 0 1.5rem", // Add consistent padding for numbers
        listStyleType: "decimal", // Ensure proper number markers
            },
            "ul > li::marker": {
              color: theme("colors.black"), // Force bullet color to black
            },
            "ol > li::marker": {
              color: theme("colors.black"), // Force number color to black
            },
            li: {
              marginBottom: "0.25rem", // Adjust spacing between list items
            },
          },
        },
      }),
    },
  },
  plugins: [animate, typography, forms, require('@tailwindcss/aspect-ratio')],
}