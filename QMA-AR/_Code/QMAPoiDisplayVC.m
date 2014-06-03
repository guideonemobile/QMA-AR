
#import "QMAPoiDisplayVC.h"
#import "QMAPoi.h"
#import "QMATarget.h"
#import "QMAPoiVC.h"


@interface QMAPoiDisplayVC ()

@property (nonatomic, weak) IBOutlet UIImageView *backgroundImageView;
@property (nonatomic, weak) IBOutlet UIScrollView *scrollView;

@property (nonatomic, strong) NSArray *pointsOfInterest;
@property (nonatomic) NSUInteger currentPage;

@end


@implementation QMAPoiDisplayVC {
    
    BOOL _poisLoaded;
    
}

#pragma mark - View Controller Lifecycle

- (void)viewDidLoad {
    
    [super viewDidLoad];
    
    self.currentPage = 0;
    
    NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"QMAPoi"];
    request.predicate = [NSPredicate predicateWithFormat:@"target = %@", self.currentPOI.target];
    request.sortDescriptors = @[[NSSortDescriptor sortDescriptorWithKey:@"label" ascending:YES]];
    self.pointsOfInterest = [self.currentPOI.managedObjectContext executeFetchRequest:request error:nil];
    
    self.backgroundImageView.image = self.panoramaScreenShot;
}

- (void)viewWillAppear:(BOOL)animated {
    
    [super viewWillAppear:animated];
    
    if (!_poisLoaded) {
        _poisLoaded = YES;
        [self loadPOIVCsIntoScrollView:[self.pointsOfInterest indexOfObject:self.currentPOI]];
    }
}

#pragma mark - POI View Controllers

- (void)loadPOIVCsIntoScrollView:(NSUInteger)startingIndex {
    
    //Load POI VCs
    for (uint i = 0, j = startingIndex; i < [self.pointsOfInterest count]; i++) {
        
        QMAPoiVC *vc = [self.storyboard instantiateViewControllerWithIdentifier:@"POIViewController"];
        vc.poi = self.pointsOfInterest[j];
        
        CGRect frame = self.scrollView.bounds;
        frame.origin.x = frame.size.width * i;
        vc.view.frame = frame;
        
        [self.scrollView addSubview:vc.view];
        [self addChildViewController:vc];
        [vc didMoveToParentViewController:self];
        
        j = j == [self.pointsOfInterest count] - 1 ? 0 : j+1;
    }
    
    //Add the very first one again, this time to the end
    QMAPoiVC *vc = [self.storyboard instantiateViewControllerWithIdentifier:@"POIViewController"];
    vc.poi = self.pointsOfInterest[startingIndex];
    
    CGRect frame = self.scrollView.bounds;
    frame.origin.x = frame.size.width * [self.pointsOfInterest count];
    vc.view.frame = frame;
    
    [self.scrollView addSubview:vc.view];
    [self addChildViewController:vc];
    [vc didMoveToParentViewController:self];
    
    //Set scrollView properties
    self.scrollView.contentSize = CGSizeMake(self.scrollView.frame.size.width * ([self.pointsOfInterest count]+1),
                                             self.scrollView.frame.size.height);
}

- (void)resetScrollViewToInitialPosition {
    [self.scrollView setContentOffset:CGPointZero animated:NO];
}

#pragma mark - Target Action

- (IBAction)didTapToSeeTheNextPOI:(UIButton *)sender {
    
    [self removeAllChildViewControllers];
    
    self.currentPage++;
    [self.scrollView setContentOffset:CGPointMake(self.scrollView.frame.size.width*self.currentPage, 0)
                             animated:YES];
    if (self.currentPage == [self.pointsOfInterest count]) {
        self.currentPage = 0;
        [self performSelector:@selector(resetScrollViewToInitialPosition) withObject:nil afterDelay:0.3];
    }
}

- (IBAction)didTapToClose:(UIButton *)sender {
    [self removeAllChildViewControllers];
    [self.navigationController popViewControllerAnimated:YES];
}

- (void)removeAllChildViewControllers {
    for (UIViewController *vc in self.childViewControllers) {
        if ([vc isKindOfClass:[QMAPoiVC class]]) {
            [(QMAPoiVC *)vc stopAudio];
        }
    }
}

@end
