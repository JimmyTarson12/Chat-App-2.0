"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Camera, StopCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
// Import Quagga correctly at the top level
import Quagga from "quagga"

interface BarcodeScannerProps {
  onScan: (id: string) => void
}

export default function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const startScanner = () => {
    if (!scannerRef.current) return

    try {
      // Don't re-require Quagga here, use the imported one
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
            toast({
              title: "Camera Error",
              description: "Could not access camera. Please check permissions.",
              variant: "destructive",
            })
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
          if (code && code.length < 8) {
            console.log("Barcode detected:", code)
            stopScanner()
            onScan(code)
          } else {
            console.error("Predicted wrong barcode: ", code)
            toast({
              title: "Error reading barcode",
              description: "Make sure the barcode is nice and clear",
              variant: "destructive",
            })
          }
        }
      })
    } catch (error) {
      console.error("Failed to initialize barcode scanner:", error)
      toast({
        title: "Scanner Error",
        description: "Failed to initialize barcode scanner",
        variant: "destructive",
      })
    }
  }

  const stopScanner = () => {
    try {
      // Use the imported Quagga directly
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
        Quagga.stop()
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
            Position your student ID card barcode in front of the camera to scan
          </p>
        </div>
      </CardContent>
    </Card>
  )
}