import LoadingSkeleton from '../Loading/Skeleton';

const LoadingSpinner = () => {
  return (
    <LoadingSkeleton variant="detail" label="Memuat detail..." className="py-4" />
  );
};

export default LoadingSpinner;