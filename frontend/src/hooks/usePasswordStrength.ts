import { computed, type Ref } from 'vue'
import { ZxcvbnFactory } from '@zxcvbn-ts/core'
import * as zxcvbnCommon from '@zxcvbn-ts/language-common'
import * as zxcvbnFr from '@zxcvbn-ts/language-fr'

const zxcvbn = new ZxcvbnFactory({
    translations: zxcvbnFr.translations,
    graphs: zxcvbnCommon.adjacencyGraphs,
    dictionary: {
        ...zxcvbnCommon.dictionary,
        ...zxcvbnFr.dictionary,
    },
})

const MIN_SCORE = 3
const labels = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent']
const colors = ['negative', 'negative', 'warning', 'positive', 'positive']

export function usePasswordStrength(password: Ref<string>) {
    const score = computed(() => zxcvbn.check(password.value).score)
    const label = computed(() => labels[score.value])
    const color = computed(() => colors[score.value])

    const strongEnough = () => score.value >= MIN_SCORE || 'Mot de passe trop facile à deviner'

    return { score, label, color, strongEnough }
}
