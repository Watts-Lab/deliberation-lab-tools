import { useContext } from "react";
import { Button } from "../../deliberation-empirica/client/src/components/Button";
import { Stage } from "../../deliberation-empirica/client/src/Stage";
import { StageContext } from "./stageContext";

export function StageFrame() {

    const {
        currentStageIndex,
        setCurrentStageIndex,
        elapsed,
        setElapsed,
        treatment,
        setTreatment,
        templatesMap,
        setTemplatesMap,
        refData,
        setRefData,
        selectedTreatmentIndex,
        setSelectedTreatmentIndex
    } = useContext(StageContext);

    console.log("Stage index in stage frame", currentStageIndex);

    const next = () => {
        
        if (treatment.treatments[selectedTreatmentIndex]?.gameStages.length > currentStageIndex + 1) {
            setCurrentStageIndex(currentStageIndex + 1);
        } else {
            // probably change to a VSCode window information message
            console.log("Last stage index", currentStageIndex);
        }
    };

    const prev = () => {
        
        if (currentStageIndex > 0) {
            setCurrentStageIndex(currentStageIndex - 1);
        } else {
            // probably change to a VSCode window information message
            console.log("First stage index", currentStageIndex);
        }
    };

    // Stage properties/navigation listed at the top
    return (<>
        <div class="stage-frame" style={{
            borderBottom: "2px solid black",
            width: "100%",
            paddingTop: "5px",
            paddingBottom: "5px" }}>
            <p>This will not be shown during the experiment. Use the arrow buttons to toggle through the different stages.</p>
            <div display="flex">
                <Button testId="stageFrameButton" handleClick={prev} style={{marginRight: "5px"}}>
                    &larr;
                </Button>
                <Button testId="stageFrameButton" handleClick={next}>
                    &rarr;
                </Button>
                <p>Current Stage: {currentStageIndex + 1}</p>
            </div>
            {/* Other fields to include: duration? */}
        </div>
        <Stage />
    </>);
}