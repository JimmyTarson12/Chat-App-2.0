"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, StopCircle } from "lucide-react"

interface BarcodeScannerProps {
  onScan: (id: string) => void
}

export default function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef<HTMLDivElement>(null)

  const startScanner = async () => {
    if (!scannerRef.current) return

    try {
      // Dynamically import Quagga to ensure it only loads in the browser
      const Quagga = (await import("quagga")).default

      Quagga.init(
        {
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: scannerRef.current,
            constraints: {
              width: 480,
              height: 320,
              facingMode: "environment",
            },
          },
          locator: {
            patchSize: "medium",
            halfSample: true,
          },
          numOfWorkers: 2,
          decoder: {
            readers: ["code_128_reader", "ean_reader", "code_39_reader"],
          },
          locate: true,
        },
        (err) => {
          if (err) {
            console.error("Error initializing Quagga:", err)
            return
          }
          console.log("Quagga initialized successfully")
          Quagga.start()
          setScanning(true)
        },
      )

      Quagga.onDetected((result) => {
        if (result && result.codeResult) {
          const code = result.codeResult.code
          if (code) {
            console.log("Barcode detected:", code)
            stopScanner()
            onScan(code)
          }
        }
      })
    } catch (error) {
      console.error("Failed to initialize barcode scanner:", error)
    }
  }

  const stopScanner = async () => {
    try {
      const Quagga = (await import("quagga")).default
      Quagga.stop()
      setScanning(false)
    } catch (error) {
      console.error("Failed to stop scanner:", error)
    }
  }

  useEffect(() => {
    return () => {
      if (scanning) {
        // Clean up on component unmount
        import("quagga").then(({ default: Quagga }) => {
          Quagga.stop()
        })
      }
    }
  }, [scanning])

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex flex-col items-center gap-4">
          <div
            ref={scannerRef}
            className={`w-full h-64 overflow-hidden rounded-md border ${scanning ? "block" : "hidden"}`}
          ></div>

          {!scanning ? (
            <Button onClick={startScanner} className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              Scan ID Card
            </Button>
          ) : (
            <Button onClick={stopScanner} variant="destructive" className="w-full">
              <StopCircle className="mr-2 h-4 w-4" />
              Stop Scanning
            </Button>
          )}

          <p className="text-sm text-muted-foreground text-center">
            Position your ID card barcode in front of the camera to scan
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
