export interface Student {
    firstName: string
    lastName: string
    email: string
    id: string
  }
  
  export async function fetchStudentData(): Promise<Student[]> {
    try {
      const response = await fetch(
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Class%20of%202030%20people%20-%20Sheet1-AQqyvTTDQt65GjyuYSc8PCCSyGIMIn.csv",
      )
  
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.status}`)
      }
  
      const csvText = await response.text()
      const students: Student[] = []
  
      // Parse CSV
      const lines = csvText.split("\n")
      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
  
        // Split by comma, handling potential quoted values
        const values = line.split(",")
  
        if (values.length >= 3) {
          const firstName = values[0].trim()
          const lastName = values[1].trim()
          const email = values[2].trim()
  
          // Extract ID from email (assuming format like 2185196@jeffcoschools.us)
          const idMatch = email.match(/^(\d+)@/)
          const id = idMatch ? idMatch[1] : ""
  
          if (id) {
            students.push({
              firstName,
              lastName,
              email,
              id,
            })
          }
        }
      }
  
      return students
    } catch (error) {
      console.error("Error fetching or parsing student data:", error)
      return []
    }
  }
  
  export function findStudentById(students: Student[], id: string): Student | undefined {
    return students.find((student) => student.id === id)
  }
  