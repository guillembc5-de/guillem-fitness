// Rutinas precargadas de Guillem (sacadas de sus vídeos de Hevy, 4/11/2026).
// Se insertan una sola vez, solo si la tabla de rutinas está vacía.
import type { SetType } from '@/domain/enums';

export type SeedRoutine = {
  id: string;
  name: string;
  position: number;
  exercises: {
    id: string;
    exerciseSlug: string;
    position: number;
    restSeconds: number | null;
    sets: { id: string; position: number; setType: SetType; targetWeightKg: number; targetReps: number }[];
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
  }
];
