export type Adapter<TDto, TViewModel> = (dto: TDto) => TViewModel;

export function defineAdapter<TDto, TViewModel>(
  adapter: Adapter<TDto, TViewModel>,
): Adapter<TDto, TViewModel> {
  return adapter;
}
