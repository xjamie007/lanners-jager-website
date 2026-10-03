// Freisteller mit Apple Vision (Subject Lifting): freisteller <eingabe> <ausgabe.png> [instanz-index …]
// Schreibt das Motiv mit transparentem Hintergrund in voller Auflösung.
// Ohne Index: alle erkannten Instanzen. Gibt Instanzen und Bounding Boxes auf stdout aus.
// Zusätzlich eine Zeile "meta: {…}" mit Gesichtern und Körperpunkten (relativ, Ursprung
// oben links), damit aufbereiten.py Fotos mit Person einheitlich unter dem Kinn beschneiden kann.
import AppKit
import CoreImage
import Vision

let args = CommandLine.arguments
guard args.count >= 3 else {
  FileHandle.standardError.write("usage: freisteller in out.png [instanz…]\n".data(using: .utf8)!)
  exit(1)
}
let ein = URL(fileURLWithPath: args[1])
let aus = URL(fileURLWithPath: args[2])
let handler = VNImageRequestHandler(url: ein, options: [:])
let req = VNGenerateForegroundInstanceMaskRequest()
let gesichter = VNDetectFaceRectanglesRequest()
let koerper = VNDetectHumanBodyPoseRequest()
do {
  try handler.perform([req, gesichter, koerper])
} catch {
  FileHandle.standardError.write("vision: \(error)\n".data(using: .utf8)!)
  exit(2)
}
guard let obs = req.results?.first else {
  FileHandle.standardError.write("kein Motiv gefunden\n".data(using: .utf8)!)
  exit(3)
}
var instanzen = obs.allInstances
if args.count > 3 {
  instanzen = IndexSet(args[3...].compactMap { Int($0) })
}
print("instanzen: \(Array(obs.allInstances))")

// Vision rechnet mit Ursprung unten links; hier auf oben links umgerechnet
var meta: [String: Any] = [:]
meta["gesichter"] = (gesichter.results ?? []).filter { $0.confidence > 0.5 }.map { f -> [Double] in
  let b = f.boundingBox
  return [b.minX, 1 - b.maxY, b.width, b.height].map { Double($0) }
}
var punkte: [String: [Double]] = [:]
if let pose = koerper.results?.max(by: { $0.confidence < $1.confidence }),
  let alle = try? pose.recognizedPoints(.all)
{
  for (name, p) in alle where p.confidence > 0.3 {
    punkte[name.rawValue.rawValue] = [Double(p.location.x), Double(1 - p.location.y), Double(p.confidence)]
  }
}
meta["koerper"] = punkte
if let json = try? JSONSerialization.data(withJSONObject: meta), let s = String(data: json, encoding: .utf8) {
  print("meta: \(s)")
}

let puffer = try obs.generateMaskedImage(ofInstances: instanzen, from: handler, croppedToInstancesExtent: false)
let bild = CIImage(cvPixelBuffer: puffer)
let ctx = CIContext()
guard let farbraum = CGColorSpace(name: CGColorSpace.sRGB) else { exit(4) }
try ctx.writePNGRepresentation(of: bild, to: aus, format: .RGBA8, colorSpace: farbraum)
print("ok \(Int(bild.extent.width))x\(Int(bild.extent.height))")
