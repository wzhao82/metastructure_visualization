
import aspose.threed as threed
from aspose.threed import Scene

# Load input OBJ file with Scene class
scene = Scene.from_file("unit-gyroid.stl");

options = threed.formats.ObjSaveOptions()

# Convert STL to OBJ file
scene.save("unit-gyroid.obj", options)