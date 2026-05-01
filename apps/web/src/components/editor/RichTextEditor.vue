<script setup lang="ts">
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { onBeforeUnmount, watch } from 'vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const editor = useEditor({
  content: props.modelValue || '<p></p>',
  extensions: [StarterKit],
  editorProps: {
    attributes: {
      class: 'bff-editor min-h-[220px] px-6 py-5 text-[17px] leading-relaxed focus:outline-none',
    },
  },
  onUpdate({ editor }) {
    emit('update:modelValue', editor.getHTML())
  },
})

watch(
  () => props.modelValue,
  (next) => {
    if (!editor.value) return
    const target = typeof next === 'string' ? next : '<p></p>'
    if (editor.value.getHTML() === target) return
    editor.value.commands.setContent(target || '<p></p>', { emitUpdate: false })
  },
)

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="rounded-2xl border border-black/[0.1] bg-white">
    <div v-if="editor" class="flex flex-wrap gap-2 border-b border-black/[0.06] px-4 py-3">
      <button type="button" class="rounded-lg px-3 py-1 text-sm hover:bg-stone-100" @click="editor.chain().focus().toggleBold().run()">
        Bold
      </button>
      <button type="button" class="rounded-lg px-3 py-1 text-sm hover:bg-stone-100" @click="editor.chain().focus().toggleItalic().run()">
        Italic
      </button>
      <button type="button" class="rounded-lg px-3 py-1 text-sm hover:bg-stone-100" @click="editor.chain().focus().toggleBulletList().run()">
        Bullets
      </button>
      <button type="button" class="rounded-lg px-3 py-1 text-sm hover:bg-stone-100" @click="editor.chain().focus().toggleOrderedList().run()">
        Numbered
      </button>
      <button type="button" class="rounded-lg px-3 py-1 text-sm hover:bg-stone-100" @click="editor.chain().focus().undo().run()">
        Undo
      </button>
    </div>
    <editor-content v-if="editor" class="[&_.bff-editor>p]:my-6" :editor="editor" />
  </div>
</template>
