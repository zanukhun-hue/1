"""Build the real ceramic Ae sculpture with Blender 4.3+.

Run from the repository root:
  blender --background --python tools/build-ae-model.py -- --output assets/models

The exported glTF is Y-up, faces +Z, and is centred at the origin. All visible
parts are meshes with bevelled surfaces; there are no text/image planes or
external textures. The studio lights are for the transparent fallback only.
"""

import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="assets/models")
    parser.add_argument("--blend", default="")
    parser.add_argument("--size", default=768, type=int)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])


def srgb(hex_value):
    values = [int(hex_value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values) + (1,)


def material(name, color, metallic=.28, roughness=.24, coat=.55):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = srgb(color)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Coat Weight"].default_value = coat
    bsdf.inputs["Coat Roughness"].default_value = .16
    mat.diffuse_color = srgb(color)
    return mat


def torus(name, major, minor, z, mat, segments=160, sides=32, depth_scale=1):
    # A dense, closed, round section produces continuous studio reflections.
    vertices, faces = [], []
    for i in range(segments):
        u = 2 * math.pi * i / segments
        for j in range(sides):
            v = 2 * math.pi * j / sides
            radius = major + minor * math.cos(v)
            vertices.append((radius * math.cos(u), radius * math.sin(u), z + minor * math.sin(v) * depth_scale))
    for i in range(segments):
        for j in range(sides):
            a = i * sides + j
            b = ((i + 1) % segments) * sides + j
            c = ((i + 1) % segments) * sides + (j + 1) % sides
            d = i * sides + (j + 1) % sides
            faces.append((a, b, c, d))
    mesh = bpy.data.meshes.new(name + " geometry")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(mat)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for poly in mesh.polygons:
        poly.use_smooth = True
    return obj


def monogram(front, bevel, side):
    curve = bpy.data.curves.new("Sculpted Ae glyph outlines", "FONT")
    curve.body = "Ae"
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = 2.35
    curve.space_character = 1.04
    curve.resolution_u = 16
    curve.extrude = .13
    curve.bevel_depth = .055
    curve.bevel_resolution = 5
    curve.fill_mode = "BOTH"
    font = Path("C:/Windows/Fonts/arialbd.ttf")
    if font.exists():
        curve.font = bpy.data.fonts.load(str(font))
    obj = bpy.data.objects.new("Ae / solid bevelled monogram", curve)
    bpy.context.collection.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.context.view_layer.update()
    # Size to the aperture and place the glyph faces just ahead of the frame.
    scale = 2.65 / obj.dimensions.x
    obj.scale = (scale, scale, 1)
    obj.location.z = .12
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.object
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    # Centre the actual glyph geometry rather than the font's em box.
    xs = [v.co.x for v in obj.data.vertices]
    ys = [v.co.y for v in obj.data.vertices]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    for vertex in obj.data.vertices:
        vertex.co.x -= cx
        vertex.co.y -= cy
    for mat in (front, bevel, side):
        obj.data.materials.append(mat)
    obj.data.update()
    for polygon in obj.data.polygons:
        nz = polygon.normal.z
        polygon.material_index = 0 if nz > .98 else 1 if nz > .1 else 2
        # Flat caps remain perfectly planar; bevel strips interpolate smoothly.
        polygon.use_smooth = abs(nz) < .98
    obj.select_set(False)
    return obj


def light(name, position, energy, color, size, shape="DISK", size_y=None):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.color = color
    data.shape = shape
    data.size = size
    if size_y is not None:
        data.size_y = size_y
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = position
    obj.rotation_euler = (-obj.location).to_track_quat("-Z", "Y").to_euler()
    return obj


def build(options):
    output = Path(options.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablock in list(bpy.data.materials):
        bpy.data.materials.remove(datablock)

    pink = material("Rose porcelain / clear glaze", "DE73A9", .25, .23, .72)
    front = material("Pearl pink / glyph face", "F8BDDC", .32, .24, .65)
    bevel = material("Petal chrome / softened bevel", "E78BC2", .48, .2, .65)
    side = material("Mulberry ceramic / glyph sides", "9D5089", .35, .24, .6)
    lilac = material("Lilac anodised edge", "9875C0", .58, .22, .45)

    frame = torus("Continuous porcelain frame", 1.66, .285, -.12, pink, depth_scale=.85)
    # A narrow rear lip makes the object feel manufactured when gently tilted.
    rear = torus("Lilac rear lip", 1.66, .225, -.285, lilac, segments=160, sides=24, depth_scale=.46)
    glyph = monogram(front, bevel, side)
    sculpture = (frame, rear, glyph)
    # Construct in XY for clean text, then put it on Blender's XZ plane. Blender
    # -Y becomes glTF +Z when the exporter converts to the web's Y-up system.
    for obj in sculpture:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        obj.rotation_euler.x = math.pi / 2
        obj.location = Vector((obj.location.x, -obj.location.z, obj.location.y))
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    coords = [vertex.co.copy() for obj in sculpture for vertex in obj.data.vertices]
    lower = Vector(tuple(min(v[axis] for v in coords) for axis in range(3)))
    upper = Vector(tuple(max(v[axis] for v in coords) for axis in range(3)))
    centre = (lower + upper) / 2
    for obj in sculpture:
        for vertex in obj.data.vertices:
            vertex.co -= centre
        obj.data.update()
    bounds_blender = upper - lower
    bounds_gltf = [round(bounds_blender.x, 5), round(bounds_blender.z, 5), round(bounds_blender.y, 5)]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in sculpture:
        obj.select_set(True)
    glb = output / "ae-sculpture.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(glb), export_format="GLB", use_selection=True,
        export_yup=True, export_apply=True, export_materials="EXPORT",
        export_cameras=False, export_lights=False, export_animations=False,
        export_texcoords=False, export_normals=True, export_tangents=False,
    )

    # The fallback is rendered from the same exported geometry, with a restrained
    # studio camera that reveals thickness without ever mirroring the lettering.
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 64
    scene.cycles.use_denoising = True
    scene.render.resolution_x = options.size
    scene.render.resolution_y = options.size
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (.12, .12, .12, 1)
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = .55
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    light("Large warm key", (-3.7, -5, 5.5), 1150, (1, .91, .88), 4.5)
    light("Pearl vertical reflection", (3.8, -3, 2), 1000, (.83, .87, 1), 1.4, "RECTANGLE", 4.5)
    light("Soft lavender rim", (-3, 1, 1.5), 1250, (.66, .5, 1), 3)
    light("Low pink reflection", (0, -1.4, -4.5), 750, (1, .35, .58), 3.5)
    camera_data = bpy.data.cameras.new("Studio poster camera")
    camera = bpy.data.objects.new("Studio poster camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (1.15, -8.5, .85)
    camera.rotation_euler = (-camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 4.75
    camera.data.lens = 65
    scene.camera = camera
    scene.render.filepath = str(output / "ae-sculpture.png")
    if options.blend:
        blend = Path(options.blend).resolve()
        blend.parent.mkdir(parents=True, exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    bpy.ops.render.render(write_still=True)
    metadata = {
        "generator": "Blender " + bpy.app.version_string,
        "glb": glb.name, "frontAxis": "+Z", "upAxis": "+Y",
        "centre": [0, 0, 0], "bounds": bounds_gltf,
        "meshes": len(sculpture), "glbBytes": glb.stat().st_size,
        "materials": [mat.name for mat in (pink, front, bevel, side, lilac)],
        "recommendedMotion": "Rock Y +/- 16 degrees; X +/- 9 degrees. Keep face towards camera.",
        "source": "tools/build-ae-model.py",
    }
    (output / "ae-sculpture.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print("AE_MODEL_READY " + json.dumps(metadata))


build(args())
