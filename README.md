## Build with Electron

1. Install dependencies:

	 ```bash
	 npm install
	 ```

2. Run locally in web dev mode (Next.js + Next API routes):
   
     ```bash
     npm run dev
     ```

3. Build for web hosting (Vercel-compatible):

	 ```bash
	 npm run build:web
	 ```

4. Build the Next.js static output for Electron (writes to `out/` because `BUILD_TARGET=electron` enables `output: "export"`):

	 ```bash
	 npm run build:electron
	 ```

5. Start Electron locally:

	 ```bash
	 npm run start:electron
	 ```

6. Create Electron builds:

	 - Create platform installers:

		 ```bash
		 npm run make
		 ```

    - You will find `/forge-out/make/` folder containing .zip of installers for your platform.
