import React from "react"
import { VERSION } from "../../common/settings"

const About: React.FC = () => {
  return (
    <>
      <h2>About</h2>
      <p>Version: {VERSION}</p>
      <p>
        This extension empowers AI to work alongside you in the browser.
      </p>
    </>
  )
}

export default About
