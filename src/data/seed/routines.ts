// Rutinas precargadas de Guillem (sacadas de sus vídeos de Hevy, 4/11/2026).
// Cada una se inserta una sola vez (por su id): si la borras, no vuelve.
import type { SetType } from '@/domain/enums';

export type SeedRoutine = {
  id: string;
  name: string;
  position: number;
  notes?: string;
  exercises: {
    id: string;
    exerciseSlug: string;
    position: number;
    restSeconds: number | null;
    notes?: string;
    sets: {
      id: string;
      position: number;
      setType: SetType;
      targetWeightKg: number | null;
      targetReps: number | null;
      targetDurationS?: number | null;
    }[];
  }[];
};

export const SEED_ROUTINES: readonly SeedRoutine[] = [
  {
    id: '23c48226-11e7-4efe-965b-49690e7aa99b',
    name: 'lower 1',
    position: 0,
    exercises: [
      {
        id: '71dacb7a-08c9-485c-ae71-23657a9022b8',
        exerciseSlug: 'hiperextension-peso',
        position: 0,
        restSeconds: null,
        sets: [
          {
            id: '6cd86ef1-e8ab-46ba-897d-8d85843edb2e',
            position: 0,
            setType: 'warmup',
            targetWeightKg: 0,
            targetReps: 10
          },
          {
            id: 'ec346f31-55d8-48b3-9835-1f2abf962b48',
            position: 1,
            setType: 'warmup',
            targetWeightKg: 10,
            targetReps: 10
          }
        ]
      },
      {
        id: '51442745-78d3-4b3a-97c3-08aabec6cbfb',
        exerciseSlug: 'extensiones-una-pierna',
        position: 1,
        restSeconds: 150,
        sets: [
          {
            id: 'e0bc0b6d-0ea4-43e4-ac6f-deb0607df6bb',
            position: 0,
            setType: 'normal',
            targetWeightKg: 30,
            targetReps: 10
          },
          {
            id: 'affc18ff-8865-4192-8cf5-8159a8c709b1',
            position: 1,
            setType: 'normal',
            targetWeightKg: 35,
            targetReps: 4
          },
          {
            id: 'a504b8ef-1549-4299-b2cd-95b3aa4d203f',
            position: 2,
            setType: 'normal',
            targetWeightKg: 30,
            targetReps: 9
          }
        ]
      },
      {
        id: 'f8c39393-86aa-4e79-a570-d15f2b92cc2f',
        exerciseSlug: 'curl-pierna-sentado',
        position: 2,
        restSeconds: 150,
        sets: [
          {
            id: '69a87641-84cf-4e45-bd18-62e574dee1b2',
            position: 0,
            setType: 'normal',
            targetWeightKg: 25,
            targetReps: 9
          },
          {
            id: '103cf365-b2b0-414f-af36-f6304ce82922',
            position: 1,
            setType: 'normal',
            targetWeightKg: 25,
            targetReps: 7
          },
          {
            id: 'a0d1311b-448f-44d2-9d39-498a53a4e0e7',
            position: 2,
            setType: 'normal',
            targetWeightKg: 25,
            targetReps: 6
          }
        ]
      },
      {
        id: 'f5289a70-d227-4114-acee-7aace77b47a2',
        exerciseSlug: 'sentadilla-hack-maquina',
        position: 3,
        restSeconds: 180,
        sets: [
          {
            id: 'a1809330-7527-4dd1-86cc-ce2f05f58165',
            position: 0,
            setType: 'normal',
            targetWeightKg: 20,
            targetReps: 10
          },
          {
            id: '7c8bbac6-9123-46dd-a330-1daff35cf5b8',
            position: 1,
            setType: 'normal',
            targetWeightKg: 40,
            targetReps: 10
          },
          {
            id: '0ce3c45f-5edb-4a2e-b13c-84d42dc6fe3f',
            position: 2,
            setType: 'normal',
            targetWeightKg: 40,
            targetReps: 8
          }
        ]
      },
      {
        id: '3cf67b05-1fbb-4288-acc5-b4214c045177',
        exerciseSlug: 'peso-muerto-rumano-barra',
        position: 4,
        restSeconds: 180,
        sets: [
          {
            id: 'd6f443fc-f3ad-4b5e-8e27-998c6b684190',
            position: 0,
            setType: 'normal',
            targetWeightKg: 90,
            targetReps: 10
          },
          {
            id: 'b7a8e0da-555f-442a-aad3-f05dd1fccc86',
            position: 1,
            setType: 'normal',
            targetWeightKg: 90,
            targetReps: 8
          },
          {
            id: 'bfd725c5-daef-48f5-97b7-c77783815f31',
            position: 2,
            setType: 'normal',
            targetWeightKg: 90,
            targetReps: 6
          }
        ]
      },
      {
        id: 'c7d5751e-29c1-4709-9160-66ef168a5537',
        exerciseSlug: 'aduccion-cadera-maquina',
        position: 5,
        restSeconds: 90,
        sets: [
          {
            id: 'e807e6ee-01f3-4ae1-a84a-e0eeeeacc40f',
            position: 0,
            setType: 'normal',
            targetWeightKg: 70,
            targetReps: 9
          },
          {
            id: 'a2adf5b8-19c9-45fd-a2b3-2a76e1c4e58c',
            position: 1,
            setType: 'normal',
            targetWeightKg: 70,
            targetReps: 6
          }
        ]
      },
      {
        id: '52ca675a-0460-43ed-98c8-d8832545794f',
        exerciseSlug: 'abduccion-cadera-maquina',
        position: 6,
        restSeconds: 90,
        sets: [
          {
            id: 'b0802128-4fb5-495a-9f5f-d82476dcd27a',
            position: 0,
            setType: 'normal',
            targetWeightKg: 70,
            targetReps: 5
          },
          {
            id: '5ecf5306-6814-44da-aaa1-d765dbe94b29',
            position: 1,
            setType: 'normal',
            targetWeightKg: 70,
            targetReps: 6
          }
        ]
      },
      {
        id: '73ccc8b5-a0ae-490e-86c1-ac35944dd777',
        exerciseSlug: 'gemelos-pie-maquina',
        position: 7,
        restSeconds: 120,
        sets: [
          {
            id: 'debf4c54-6593-478f-9e17-f68faf1cf854',
            position: 0,
            setType: 'normal',
            targetWeightKg: 40,
            targetReps: 8
          },
          {
            id: 'e3272dc2-99d4-4807-af28-5d800582faf5',
            position: 1,
            setType: 'normal',
            targetWeightKg: 40,
            targetReps: 6
          }
        ]
      }
    ]
  },
  {
    id: 'd19835e2-9d02-4c95-b0a5-6d36f45cfab4',
    name: 'upper 1',
    position: 1,
    exercises: [
      {
        id: '0843d1b1-009c-46e4-ba0c-bb5d4b9863da',
        exerciseSlug: 'press-pecho-inclinado-maquina',
        position: 0,
        restSeconds: 150,
        sets: [
          {
            id: '1a6189eb-d310-443e-8517-658b96b479f1',
            position: 0,
            setType: 'normal',
            targetWeightKg: 60,
            targetReps: 7
          },
          {
            id: 'd2d3f1c4-804b-4dd7-8c62-1300f0b7a06d',
            position: 1,
            setType: 'normal',
            targetWeightKg: 60,
            targetReps: 5
          },
          {
            id: 'f38702df-af59-48d1-8b2e-24723ad85a37',
            position: 2,
            setType: 'normal',
            targetWeightKg: 60,
            targetReps: 4
          },
          {
            id: 'bacaebbf-72a7-4236-9f45-42542999bacc',
            position: 3,
            setType: 'normal',
            targetWeightKg: 50,
            targetReps: 8
          }
        ]
      },
      {
        id: 'c86515b7-4e36-47f0-87c8-097811ff0e9a',
        exerciseSlug: 'jalon-pecho-polea',
        position: 1,
        restSeconds: 150,
        sets: [
          {
            id: '9de3eb03-2fef-4388-b654-4cb9d82a5e19',
            position: 0,
            setType: 'normal',
            targetWeightKg: 70,
            targetReps: 5
          },
          {
            id: '0eb50930-6cae-4bb7-b589-f412daa8aa10',
            position: 1,
            setType: 'normal',
            targetWeightKg: 65,
            targetReps: 7
          },
          {
            id: '0f6f0e8a-aee8-4578-8aab-ff289354aca0',
            position: 2,
            setType: 'normal',
            targetWeightKg: 65,
            targetReps: 5
          },
          {
            id: '190f950f-4507-47b5-a6b9-4c87c5d35559',
            position: 3,
            setType: 'normal',
            targetWeightKg: 60,
            targetReps: 6
          }
        ]
      },
      {
        id: '3288f9d9-af9f-4471-a47a-35364dc101d8',
        exerciseSlug: 'press-hombros-discos',
        position: 2,
        restSeconds: 150,
        sets: [
          {
            id: '6ce78a0e-97b7-4de6-a078-751e33ea14c0',
            position: 0,
            setType: 'normal',
            targetWeightKg: 60,
            targetReps: 8
          },
          {
            id: 'f9d44c07-a35f-4c82-813f-e3c56cbbcf39',
            position: 1,
            setType: 'normal',
            targetWeightKg: 60,
            targetReps: 5
          }
        ]
      },
      {
        id: 'e0a636e5-e480-4c9e-afb8-95a8f510a02b',
        exerciseSlug: 'elevacion-lateral-un-brazo-polea',
        position: 3,
        restSeconds: 150,
        sets: [
          {
            id: 'cd410b44-0fbd-40a7-ad92-8dec665fe124',
            position: 0,
            setType: 'normal',
            targetWeightKg: 15,
            targetReps: 10
          },
          {
            id: '7bfb3574-c6e6-4b1c-ad26-17002ebb1bee',
            position: 1,
            setType: 'normal',
            targetWeightKg: 15,
            targetReps: 10
          }
        ]
      },
      {
        id: '883aecfd-c4bc-4965-b693-7bd2729700b6',
        exerciseSlug: 'jalon-triceps-polea',
        position: 4,
        restSeconds: 150,
        sets: [
          {
            id: 'dd224d58-5e64-43d6-b417-7a3839dbb022',
            position: 0,
            setType: 'normal',
            targetWeightKg: 15,
            targetReps: 12
          },
          {
            id: '6667c00a-7771-4e70-bb27-9ab9eec5c910',
            position: 1,
            setType: 'normal',
            targetWeightKg: 15,
            targetReps: 10
          }
        ]
      },
      {
        id: '45f39e39-1c17-4c30-9905-d4cf824a8635',
        exerciseSlug: 'curl-polea',
        position: 5,
        restSeconds: 150,
        sets: [
          {
            id: '560533b0-bfd0-499d-a557-31c0fcb5d285',
            position: 0,
            setType: 'normal',
            targetWeightKg: 40,
            targetReps: 8
          },
          {
            id: 'ec84563c-ff24-4298-90e4-bcaa89b122e1',
            position: 1,
            setType: 'normal',
            targetWeightKg: 40,
            targetReps: 7
          }
        ]
      }
    ]
  },
  // lower 2 y upper 2: del vídeo de Hevy del 6/11/2026.
  {
    id: 'eb9065c3-d23f-4105-8bd2-bbe7eacae86d',
    name: 'lower 2',
    position: 2,
    exercises: [
      {
        id: 'd015469f-157f-4cc7-8eef-59fe0f9739de',
        exerciseSlug: 'extensiones-una-pierna',
        position: 0,
        restSeconds: null,
        sets: [
          { id: '79c34078-b88a-406f-a4f2-4b406f76e1e8', position: 0, setType: 'normal', targetWeightKg: 30, targetReps: 6 },
          { id: 'b7480147-b3b8-4ca3-bbf3-6c9629bf20ab', position: 1, setType: 'normal', targetWeightKg: 25, targetReps: 8 },
          { id: '5f6b2a5f-e55d-4bf8-983b-da8ee8b509ab', position: 2, setType: 'normal', targetWeightKg: 25, targetReps: 7 },
        ],
      },
      {
        id: '7eecfb4b-6279-48ec-8899-3e68625a88f9',
        exerciseSlug: 'curl-pierna-pie',
        position: 1,
        restSeconds: null,
        sets: [
          { id: '9b248e7e-7797-40b9-9752-f7d225383556', position: 0, setType: 'normal', targetWeightKg: 15, targetReps: 8 },
          { id: '078a9f26-0454-438a-9f11-9af089117ef0', position: 1, setType: 'normal', targetWeightKg: 15, targetReps: 8 },
          { id: '648f0a2c-9278-41e9-95d7-afa835ddfcbf', position: 2, setType: 'normal', targetWeightKg: 15, targetReps: 6 },
        ],
      },
      {
        id: '9f220449-42fe-4f51-b53d-b0e775494594',
        exerciseSlug: 'prensa-piernas',
        position: 2,
        restSeconds: null,
        sets: [
          { id: 'ca5cc18c-1a30-4e72-8559-d94f826bc25d', position: 0, setType: 'normal', targetWeightKg: 80, targetReps: 12 },
          { id: 'f9594282-3063-4ae9-b40e-eece189ef8c4', position: 1, setType: 'normal', targetWeightKg: 100, targetReps: 12 },
          { id: 'eb04f6f1-86dd-40ac-8426-ed69940dd7a8', position: 2, setType: 'normal', targetWeightKg: 100, targetReps: 12 },
        ],
      },
      {
        id: '64259962-b668-473b-8c5c-e37426f9bbb0',
        exerciseSlug: 'peso-muerto-rumano-barra',
        position: 3,
        restSeconds: null,
        sets: [
          { id: 'c86addf2-7bfc-4633-929d-95ad841c995a', position: 0, setType: 'normal', targetWeightKg: 80, targetReps: 8 },
          { id: 'ce4a2f91-7040-4b74-be71-42c54d2a95d5', position: 1, setType: 'normal', targetWeightKg: 80, targetReps: 8 },
          { id: '3ddfd682-d755-4064-87e0-760f5cd18034', position: 2, setType: 'normal', targetWeightKg: 80, targetReps: 6 },
        ],
      },
      {
        id: '00591bc1-cc74-41d6-a134-42c72980cabe',
        exerciseSlug: 'abduccion-cadera-maquina',
        position: 4,
        restSeconds: null,
        sets: [
          { id: '9718c68b-18e5-48d4-8182-9b7543316ba2', position: 0, setType: 'normal', targetWeightKg: 60, targetReps: 10 },
          { id: 'b2010908-53f6-4161-a4ae-a61339a0a321', position: 1, setType: 'normal', targetWeightKg: 60, targetReps: 8 },
        ],
      },
      {
        id: '00cdea99-fbac-465e-9c0a-6eb3dbb3c878',
        exerciseSlug: 'aduccion-cadera-maquina',
        position: 5,
        restSeconds: null,
        sets: [
          { id: '0eb968e7-2553-43b7-a391-56cc7f94a36d', position: 0, setType: 'normal', targetWeightKg: 50, targetReps: 12 },
          { id: '1dddeea1-0db9-4573-b2de-2f536c30b3e0', position: 1, setType: 'normal', targetWeightKg: 60, targetReps: 12 },
        ],
      },
      {
        id: '81e1ad42-217b-4061-889a-f226352cbcbe',
        exerciseSlug: 'extension-pantorrilla-maquina',
        position: 6,
        restSeconds: null,
        sets: [
          { id: '84954678-776c-4af2-be59-fb4497d37412', position: 0, setType: 'normal', targetWeightKg: 100, targetReps: 12 },
          { id: '8dc2d0fa-321c-4541-afef-203e12098e53', position: 1, setType: 'normal', targetWeightKg: 100, targetReps: 10 },
          { id: '99f8db36-e740-4a5d-a7c9-51057377bd63', position: 2, setType: 'normal', targetWeightKg: 100, targetReps: 10 },
        ],
      },
      {
        id: '601b05cd-b4e5-4149-b629-d713677ec433',
        exerciseSlug: 'hip-thrust-maquina',
        position: 7,
        restSeconds: null,
        sets: [
          { id: 'bbd4d548-40a0-49c6-878a-d9ff8ef1f12f', position: 0, setType: 'normal', targetWeightKg: 40, targetReps: 9 },
          { id: '97fcebf2-36e4-4eb2-a628-6b62e2a9f7b1', position: 1, setType: 'normal', targetWeightKg: 40, targetReps: 9 },
          { id: '38b8f82a-b31b-40cf-8fc2-242daa5fa0a1', position: 2, setType: 'normal', targetWeightKg: 40, targetReps: 6 },
        ],
      },
    ],
  },
  {
    id: 'eaa74ad5-6d40-4539-94e5-0e9740d075b4',
    name: 'upper 2',
    position: 3,
    exercises: [
      {
        id: 'f4603119-82e8-4f79-8a7f-7dd267fecad5',
        exerciseSlug: 'press-pecho-inclinado-maquina',
        position: 0,
        restSeconds: 150,
        sets: [
          { id: '2cb54ac1-4909-4407-bf22-30b2345686f1', position: 0, setType: 'normal', targetWeightKg: 60, targetReps: 6 },
          { id: '3f0f3637-5d9d-41f7-9a98-1ee923fb93e9', position: 1, setType: 'normal', targetWeightKg: 60, targetReps: 5 },
          { id: '61c23ddf-5f78-40b3-9d89-607af174edb8', position: 2, setType: 'normal', targetWeightKg: 55, targetReps: 7 },
        ],
      },
      {
        id: '1ed4a710-071f-4ac0-b2eb-86edaf4c5b67',
        exerciseSlug: 'jalon-pecho-polea',
        position: 1,
        restSeconds: 150,
        sets: [
          { id: 'd3d2e0af-b21c-41c3-b686-eb7894d509fa', position: 0, setType: 'normal', targetWeightKg: 70, targetReps: 7 },
          { id: '61acf7c2-3fdd-4ca4-b032-8c4c8d55056d', position: 1, setType: 'normal', targetWeightKg: 70, targetReps: 6 },
          { id: '08d9f895-d9bc-4e39-80a2-9f3bc2199d43', position: 2, setType: 'normal', targetWeightKg: 70, targetReps: 5 },
        ],
      },
      {
        id: '3bf2e289-6025-4ced-9b69-9331ad0e720d',
        exerciseSlug: 'press-banca-barra',
        position: 2,
        restSeconds: 150,
        sets: [
          { id: 'c12d5769-765c-4bcb-83d8-c88399d53558', position: 0, setType: 'normal', targetWeightKg: 40, targetReps: 10 },
          { id: '721007ce-18ce-4490-862a-c31d5ade3406', position: 1, setType: 'normal', targetWeightKg: 40, targetReps: 10 },
        ],
      },
      {
        id: '192f2cb7-e186-493e-855e-72f67c722396',
        exerciseSlug: 'remo-t',
        position: 3,
        restSeconds: 150,
        sets: [
          { id: '51980ae5-9f88-4ac9-8095-708c20d0332a', position: 0, setType: 'normal', targetWeightKg: 45, targetReps: 10 },
          { id: '58d51b78-f941-46b7-bbd8-5f082428e4e6', position: 1, setType: 'normal', targetWeightKg: 45, targetReps: 6 },
        ],
      },
      {
        id: '43674aab-4e82-4b14-ae10-d335dcc1fef5',
        exerciseSlug: 'press-hombros-discos',
        position: 4,
        restSeconds: 165,
        sets: [
          { id: '75cc9a1b-4902-42cc-85ad-2f2322945646', position: 0, setType: 'normal', targetWeightKg: 60, targetReps: 6 },
          { id: '1c48161f-cafd-4f55-9a72-e4fc841c6798', position: 1, setType: 'normal', targetWeightKg: 60, targetReps: 4 },
        ],
      },
      {
        id: '3bdcab3b-32b3-4c0a-94c1-47c5fe780639',
        exerciseSlug: 'elevacion-lateral-mancuernas',
        position: 5,
        restSeconds: null,
        sets: [
          { id: 'ce278e31-341e-4954-b79b-7d92ef54240d', position: 0, setType: 'normal', targetWeightKg: 10, targetReps: 12 },
          { id: 'df1e6de1-f033-4ef0-b2c1-e79aab5994f5', position: 1, setType: 'normal', targetWeightKg: 10, targetReps: 12 },
        ],
      },
      {
        id: '8746a0fc-784d-4459-a08c-f563ecf71d10',
        exerciseSlug: 'jalon-triceps-polea',
        position: 6,
        restSeconds: null,
        sets: [
          { id: '2ce6ef5c-f605-421c-b30e-0b2e81fcbabe', position: 0, setType: 'normal', targetWeightKg: 35, targetReps: 12 },
          { id: '1760ddc9-41eb-4878-84cb-eb2f216ffccd', position: 1, setType: 'normal', targetWeightKg: 40, targetReps: 8 },
        ],
      },
      {
        id: '987f3c87-1d8f-4827-b03c-21fba53f1d90',
        exerciseSlug: 'curl-polea',
        position: 7,
        restSeconds: null,
        sets: [
          { id: 'c82c7cad-53e2-4005-8ef4-bbf4e186a49b', position: 0, setType: 'normal', targetWeightKg: 40, targetReps: 10 },
          { id: '05b227f5-e8ba-492a-88a6-701c1dea0a25', position: 1, setType: 'normal', targetWeightKg: 40, targetReps: 8 },
        ],
      },
    ],
  },
  // Pauta de recuperación del fisio (pizarra, 6/11/2026). Lo que la pizarra no dice va vacío.
  {
    id: '05ac7319-07e1-4bd8-b077-4f1a215f6bcb',
    name: 'RECUPERACIÓ CREUATS',
    position: 4,
    notes: 'Pauta del fisio: activar cuádriceps → activar isquios → desplazamientos → saltos. Las series sin número las rellenas tú.',
    exercises: [
      {
        id: '75b0f3b6-697b-445b-8aa9-28dc9f7d7fbf',
        exerciseSlug: 'sentadilla-peso-corporal',
        position: 0,
        restSeconds: null,
        notes: 'Activar cuádriceps.',
        sets: [
          { id: 'ce0b14f3-814f-45e0-801d-f0b677326395', position: 0, setType: 'normal', targetWeightKg: null, targetReps: 30 },
        ],
      },
      {
        id: 'cfc47fe8-f4b6-42d8-a5ca-190a555b439d',
        exerciseSlug: 'sentadilla-salto',
        position: 1,
        restSeconds: null,
        notes: 'Activar cuádriceps.',
        sets: [
          { id: 'f11326b3-f058-4e71-ac70-fd2ccf53b3eb', position: 0, setType: 'normal', targetWeightKg: null, targetReps: 10 },
        ],
      },
      {
        id: '88762ef2-bd38-4e5e-b237-497a15ec5fcd',
        exerciseSlug: 'peso-muerto-una-pierna',
        position: 2,
        restSeconds: null,
        notes: 'Activar isquios. 5 con cada pierna (pizarra: «5/5»).',
        sets: [
          { id: '46a597d9-fe76-4780-9292-dafa0eecbd02', position: 0, setType: 'normal', targetWeightKg: null, targetReps: 5 },
        ],
      },
      {
        id: 'f5bf0d21-0c92-4c80-96c3-47f6925bcc68',
        exerciseSlug: 'puente-gluteo-una-pierna',
        position: 3,
        restSeconds: null,
        notes: 'Activar isquios. 5 con cada pierna.',
        sets: [
          { id: '5eca58ee-a614-4eb8-bca5-31733521c2fa', position: 0, setType: 'normal', targetWeightKg: null, targetReps: 5 },
        ],
      },
      {
        id: 'd494b831-05f0-49be-afb4-92907e62ce0a',
        exerciseSlug: 'desplazamientos',
        position: 4,
        restSeconds: null,
        notes: 'Desplazamientos como te indique el fisio.',
        sets: [
          { id: '60ef2554-54b1-4c99-90b0-c6b9c1f8af3f', position: 0, setType: 'normal', targetWeightKg: null, targetReps: null, targetDurationS: null },
        ],
      },
      {
        id: '305098c3-8b51-44d8-8252-a2c7c5a5bc2a',
        exerciseSlug: 'pogo-jumps',
        position: 5,
        restSeconds: null,
        notes: 'Serie 1: dos piernas · Serie 2: una pierna · Serie 3: una pierna, lateral · Serie 4: una pierna, frontal.',
        sets: [
          { id: '80e575d8-5256-425b-a12f-bdb83fac2d54', position: 0, setType: 'normal', targetWeightKg: null, targetReps: null },
          { id: '02863469-ee31-4618-9ecd-d33732197dd9', position: 1, setType: 'normal', targetWeightKg: null, targetReps: null },
          { id: '4b3a4b32-94bc-4d7b-b8ae-b150739fded9', position: 2, setType: 'normal', targetWeightKg: null, targetReps: null },
          { id: '2881383e-34dc-480b-acd9-ce5ffd5b9993', position: 3, setType: 'normal', targetWeightKg: null, targetReps: null },
        ],
      },
      {
        id: '8336fa1a-b686-4e1b-bd8f-8e829f0c93f0',
        exerciseSlug: 'saltos-patinador',
        position: 6,
        restSeconds: null,
        notes: 'Serie 1: normal · Serie 2: con rebote.',
        sets: [
          { id: '3f2285e7-1504-4364-b680-681adfc502cc', position: 0, setType: 'normal', targetWeightKg: null, targetReps: null },
          { id: 'dc1cdbaa-63f8-4459-97dd-11b91e38dd4c', position: 1, setType: 'normal', targetWeightKg: null, targetReps: null },
        ],
      },
      {
        id: '7a16fc0f-3fb2-46c7-8b58-dd43ae3b92e2',
        exerciseSlug: 'salto-cajon',
        position: 7,
        restSeconds: null,
        sets: [
          { id: '0f3ae677-4b70-4a97-9dbd-2e3f003581b7', position: 0, setType: 'normal', targetWeightKg: null, targetReps: null },
        ],
      },
      {
        id: '5bc1523b-a6cb-4ee1-a93c-4e42b3208326',
        exerciseSlug: 'bajar-cajon',
        position: 8,
        restSeconds: null,
        notes: 'Serie 1: dos piernas · Serie 2: una pierna.',
        sets: [
          { id: '11007b0d-a723-46e0-a494-fe30470b4363', position: 0, setType: 'normal', targetWeightKg: null, targetReps: null },
          { id: '840642f4-d054-4b33-857e-3b913b9be4be', position: 1, setType: 'normal', targetWeightKg: null, targetReps: null },
        ],
      },
    ],
  },
];
