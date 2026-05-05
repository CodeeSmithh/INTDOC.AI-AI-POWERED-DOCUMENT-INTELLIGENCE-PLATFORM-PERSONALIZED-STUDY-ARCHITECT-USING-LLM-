import { GradientBarsBackground } from "./gradient-bars-background";

function DemoGradientBars() {
    return (
        <GradientBarsBackground
             numBars={15}
             gradientFrom="rgb(255, 60, 0)"
        >
            <div className="text-center font-modern">
              <h1 className="text-white text-5xl md:text-7xl font-bold mb-4 tracking-tight">
                Gradient Bars
              </h1>
              <p className="text-gray-400 text-lg md:text-xl font-medium">
                Pulsing knowledge visualization
              </p>
            </div>
        </GradientBarsBackground>
    );
}

export { DemoGradientBars };
