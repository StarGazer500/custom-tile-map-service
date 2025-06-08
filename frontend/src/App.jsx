import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import {VectorTileTms,RasterTileTms} from './TileMapService'
import { Route, Routes } from "react-router-dom";


function App() {


  return (
    <>
  

      
    <Routes >
            <Route path="/vector-tms" element={<VectorTileTms/>} />    
            <Route path="/raster-tms" element={<RasterTileTms/>} />        
        </Routes>
    
      
    </>
  )
}

export default App