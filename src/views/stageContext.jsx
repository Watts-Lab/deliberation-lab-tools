//import { set } from 'node_modules/cypress/types/lodash';
import { createContext, useState, useCallback, useMemo, useEffect } from 'react'
import { stringify } from 'yaml'
import {
  useGame,
  useStage,
  usePlayer,
  useRound,
  useStageTimer,
} from '@empirica/core/player/classic/react'

const StageContext = createContext()

const StageProvider = ({ children }) => {
  // currentStageIndex can control whatever stage we are at
  const [currentStageIndex, setCurrentStageIndex] = useState(0) // changed from 'default'
  const [elapsed, setElapsed] = useState(0)
  const [treatment, setTreatment] = useState(null)
  const [templatesMap, setTemplatesMap] = useState(new Map())
  const [refData, setRefData] = useState({})
  const [selectedTreatmentIndex, setSelectedTreatmentIndex] = useState(0)
  const [selectedIntroSequenceIndex, setSelectedIntroSequenceIndex] =
    useState(0)
  const player = usePlayer()

  // for updating code editor, requires reload
  const editTreatment = useCallback(
    (newTreatment) => {
      setTreatment(newTreatment)
      localStorage.setItem('code', stringify(newTreatment))
      window.location.reload()
    },
    [setTreatment]
  )

  const contextValue = useMemo(
    () => ({
      currentStageIndex,
      setCurrentStageIndex,
      elapsed,
      setElapsed,
      treatment,
      setTreatment,
      editTreatment,
      player,
      templatesMap,
      setTemplatesMap,
      selectedTreatmentIndex,
      setSelectedTreatmentIndex,
      selectedIntroSequenceIndex,
      setSelectedIntroSequenceIndex,
      refData,
      setRefData,
    }),
    [
      currentStageIndex,
      setCurrentStageIndex,
      elapsed,
      setElapsed,
      treatment,
      setTreatment,
      editTreatment,
      player,
      templatesMap,
      setTemplatesMap,
      selectedTreatmentIndex,
      setSelectedTreatmentIndex,
      selectedIntroSequenceIndex,
      setSelectedIntroSequenceIndex,
      refData,
      setRefData,
    ]
  )

  // expose context values to the window object
  useEffect(() => {
    window.stageContext = contextValue
  }, [contextValue])

  return (
    <StageContext.Provider value={contextValue}>
      {children}
    </StageContext.Provider>
  )
}

export { StageContext, StageProvider }